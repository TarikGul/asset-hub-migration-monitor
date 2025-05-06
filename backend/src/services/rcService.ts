import type { PalletRcMigratorMigrationStage } from '../types/pjs';
import { db } from '../db';
import { migrationStages } from '../db/schema';
import { abstractApi } from './abstractApi';
import { processBlock } from './xcmProcessing';
import { EventEmitter } from 'events';

// Create an event emitter for SSE
export const migrationEvents = new EventEmitter();

export async function runRelayChainService() {
  const api = await abstractApi('relay-chain');

  const unsubscribe = await api.rpc.chain.subscribeFinalizedHeads(async (header) => {
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

  const unsubscribeMigrationStage = await api.query.rcMigrator.migrationStage(async (migrationStage: PalletRcMigratorMigrationStage) => {
    try {
      const header = await api.rpc.chain.getHeader();
      
      await db.insert(migrationStages).values({
        stage: migrationStage.type,
        details: JSON.stringify(migrationStage.toJSON()),
        blockNumber: header.number.toNumber(),
        blockHash: header.hash.toHex(),
      });
      
      migrationEvents.emit('stageUpdate', {
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
  });

  return {
    unsubscribe,
    unsubscribeMigrationStage
  };
} 