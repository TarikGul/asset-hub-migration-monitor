import type { PalletRcMigratorMigrationStage } from '../types/pjs';
import type { u32 } from '@polkadot/types';

import { db } from '../db';
import { migrationStages } from '../db/schema';
import { AbstractApi } from './abstractApi';
import { processBlock } from './xcmProcessing';
import { VoidFn } from '@polkadot/api/types';
import { eventService } from './eventService';

import { Log } from '../logging/Log';

interface RcHeadsServiceData {
  scheduledBlockNumber?: u32;
  skipAndStart?: boolean;
}

export async function runRcHeadsService(data: RcHeadsServiceData): Promise<VoidFn> {
  const { logger } = Log;
  const api = await AbstractApi.getInstance().getRelayChainApi();
  let isProcessingXcm = false;

  const unsubscribeHeads = await api.rpc.chain.subscribeFinalizedHeads(async (header) => {
    logger.info(`New block #${header.number} detected, fetching complete block...`);

    if (data.scheduledBlockNumber && header.number.toBn().gte(data.scheduledBlockNumber.toBn())) {
      isProcessingXcm = true
      logger.info(`Starting XCM message processing from block #${header.number}`);
    } else if (data.skipAndStart) {
      isProcessingXcm = true;
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
    } else if (data.scheduledBlockNumber !== null) {
      logger.info(`Waiting for scheduled block #${data.scheduledBlockNumber}, current block #${header.number}`);
    }
  });

  return unsubscribeHeads;
}

export async function runRcMigrationStageService(): Promise<VoidFn> {
  const { logger } = Log;
  const api = await AbstractApi.getInstance().getRelayChainApi();

  const unsubscribeMigrationStage = await api.query.rcMigrator.rcMigrationStage(async (migrationStage: PalletRcMigratorMigrationStage) => {
    let isMigrationScheduled = false;
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
      if (migrationStage.isScheduled && !isMigrationScheduled) {
        const scheduledBlock = migrationStage.asScheduled.blockNumber;
        eventService.emit('migrationScheduled', {
          scheduledBlock
        });
        isMigrationScheduled = true;
        logger.info(`Migration scheduled for block #${scheduledBlock}`);
      }

      if (!migrationStage.isPending || !migrationStage.isScheduled || !isMigrationScheduled) {
        eventService.emit('migrationScheduled', {
          skipAndStart: true
        });
        isMigrationScheduled = true;
        // TODO: Remove this once we have a way to detect if the migration has already started
        logger.info('Migration already started, enabling skip and start...');
      }

      eventService.emit('rcStageUpdate', {
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
