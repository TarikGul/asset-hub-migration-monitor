import type { PalletRcMigratorMigrationStage } from '../types/pjs';
import { db } from '../db';
import { migrationStages } from '../db/schema';
import { AbstractApi } from './abstractApi';
import { processBlock } from './xcmProcessing';
import { VoidFn } from '@polkadot/api/types';
import { eventService } from './eventService';

export async function runRcHeadsService(): Promise<VoidFn> {
  const api = await AbstractApi.getInstance().getRelayChainApi();

  const unsubscribeHeads = await api.rpc.chain.subscribeFinalizedHeads(async (header) => {
    console.log(`New block #${header.number} detected, fetching complete block...`);

    try {
      const signedBlock = await api.rpc.chain.getBlock(header.hash);
      const { block } = signedBlock;

      console.log(`
        Block: #${block.header.number}
        Hash: ${block.header.hash.toHex()}
        Extrinsic Count: ${block.extrinsics.length}
      `);

      // Process block for XCM messages
      const xcmMessages = await processBlock(api, block);
      if (xcmMessages.length > 0) {
        // TODO: Save to database
        console.log('XCM Messages found:', JSON.stringify(xcmMessages, null, 2));
      }
    } catch (error) {
      console.error(`Error processing block: ${error}`);
    }
  });

  return unsubscribeHeads;
}

export async function runRcMigrationStageService(): Promise<VoidFn> {
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

      eventService.emit('stageUpdate', {
        stage: migrationStage.type,
        details: migrationStage.toJSON(),
        blockNumber: header.number.toNumber(),
        blockHash: header.hash.toHex(),
        timestamp: new Date().toISOString(),
      });

      console.log('Migration stage updated:', {
        stage: migrationStage.type,
        blockNumber: header.number.toNumber(),
      });
    } catch (error) {
      console.error('Error processing migration stage:', error);
    }
  }) as unknown as VoidFn;

  return unsubscribeMigrationStage;
}
