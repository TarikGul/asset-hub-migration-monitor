import type { PalletRcMigratorMigrationStage } from '../types/pjs';
import type { u32 } from '@polkadot/types';

import { db } from '../db';
import { migrationStages } from '../db/schema';
import { AbstractApi } from './abstractApi';
import { processBlock } from './xcmProcessing';
import { VoidFn } from '@polkadot/api/types';
import { eventService } from './eventService';

import { Log } from '../logging/Log';

export async function runRcHeadsService(scheduledBlockNumber: u32): Promise<VoidFn> {
  const { logger } = Log;
  const api = await AbstractApi.getInstance().getRelayChainApi();
  let isProcessingXcm = false;

  const unsubscribeHeads = await api.rpc.chain.subscribeFinalizedHeads(async (header) => {
    logger.info(`New block #${header.number} detected, fetching complete block...`);
    if (scheduledBlockNumber !== null && header.number.toBn().gte(scheduledBlockNumber.toBn())) {
      isProcessingXcm = true
      logger.info(`Starting XCM message processing from block #${header.number}`);
    }

    if (isProcessingXcm) {
      try {
        const signedBlock = await api.rpc.chain.getBlock(header.hash);
        const { block } = signedBlock;

        logger.info(`
          Block: #${block.header.number}
          Hash: ${block.header.hash.toHex()}
          Extrinsic Count: ${block.extrinsics.length}
        `);

        // Process block for XCM messages
        const xcmMessages = await processBlock(api, block);
        if (xcmMessages.length > 0) {
          // TODO: Save to database
          logger.info('XCM Messages found:', JSON.stringify(xcmMessages, null, 2));
        }
      } catch (error) {
        logger.info(`Error processing block: ${error}`);
      }
    } else if (scheduledBlockNumber !== null) {
      logger.info(`Waiting for scheduled block #${scheduledBlockNumber}, current block #${header.number}`);
    }
  });

  return unsubscribeHeads;
}

export async function runRcMigrationStageService(): Promise<VoidFn> {
  const { logger } = Log;
  const api = await AbstractApi.getInstance().getRelayChainApi();

  const unsubscribeMigrationStage = await api.query.rcMigrator.rcMigrationStage(async (migrationStage: PalletRcMigratorMigrationStage) => {
    try {
      // TODO: Technically we want to confirm this is the block that has the proper migration stage in the events
      const header = await api.rpc.chain.getHeader();
      
      await db.insert(migrationStages).values({
        stage: migrationStage.type,
        details: JSON.stringify(migrationStage.toJSON()),
        blockNumber: header.number.toNumber(),
        blockHash: header.hash.toHex(),
      });

      // If we receive a Scheduled stage, emit an event with the block number
      if (migrationStage.isScheduled) {
        const scheduledBlock = migrationStage.asScheduled.blockNumber;
        eventService.emit('migrationScheduled', {
          scheduledBlock
        });
        logger.info(`Migration scheduled for block #${scheduledBlock}`);
      }

      eventService.emit('stageUpdate', {
        stage: migrationStage.type,
        details: migrationStage.toJSON(),
        blockNumber: header.number.toNumber(),
        blockHash: header.hash.toHex(),
        timestamp: new Date().toISOString(),
      });

      logger.info('Migration stage updated:', {
        stage: migrationStage.type,
        blockNumber: header.number.toNumber(),
      });
    } catch (error) {
      logger.info('Error processing migration stage:', error);
    }
  }) as unknown as VoidFn;

  return unsubscribeMigrationStage;
}
