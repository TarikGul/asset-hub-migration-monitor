import { db } from '../db';

import { AbstractApi } from './abstractApi';
import { processBlock } from './xcmProcessing';
import { Log } from '../logging/Log';
import { eventService } from './eventService';
import { ApiPromise } from '@polkadot/api';
import type { Block } from '@polkadot/types/interfaces';

export async function runAhHeadsService() {
  const { logger } = Log;
  const api = await AbstractApi.getInstance().getAssetHubApi();

  const unsubscribe = await api.rpc.chain.subscribeFinalizedHeads(async (header) => {
    logger.info(`New block #${header.number} detected, fetching complete block...`);

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
        logger.info('XCM Messages found:', JSON.stringify(xcmMessages, null, 2));
      }
    } catch (error) {
      logger.error(`Error processing block: ${error}`);
    }
  });

  return {
    unsubscribe
  };
}

export async function runAhMigrationStageService() {
  const { logger } = Log;
  const api = await AbstractApi.getInstance().getAssetHubApi();
  
  const unsubscribeMigrationStage = await api.query.ahMigrator.ahMigrationStage(async (migrationStage: any) => {
    try {
      const header = await api.rpc.chain.getHeader();
      
      await db.insert(migrationStage).values({
        stage: migrationStage.type,
        details: JSON.stringify(migrationStage.toJSON()),
        blockNumber: header.number.toNumber(),
        blockHash: header.hash.toHex(),
      });

      eventService.emit('ahStageUpdate', {
        stage: migrationStage.type,
        details: migrationStage.toJSON(),
        blockNumber: header.number.toNumber(),
        blockHash: header.hash.toHex(),
        timestamp: new Date().toISOString(),
      });

      logger.info('Asset HubMigration stage updated:', {
        stage: migrationStage.type,
        blockNumber: header.number.toNumber(),
      });
    } catch (error) {
      logger.error('Error processing migration stage:', error);
    }
  });

  return unsubscribeMigrationStage;
}

export async function findXcmMessages(api: ApiPromise, block: Block) {
  let upwardMessageSent = 0;
  let downwardMessagesReceived = 0;
  let downwardMessagesProcessed = 0;

  const exts = block.extrinsics.filter((extrinsic) => {
    return extrinsic.method.section === 'parachainSystem'
  });

  const apiAt = await api.at(block.hash);
  const events = await apiAt.query.system.events();
  
  for (const record of events) {
    const { event } = record;
    if (event.section === 'parachainSystem' && event.method === 'UpwardMessageSent') {
      upwardMessageSent++;
    }
    if (event.section === 'parachainSystem' && event.method === 'DownwardMessagesReceived') {
      downwardMessagesReceived += Number(event.data[0].toString());
    }
    if (event.section === 'parachainSystem' && event.method === 'DownwardMessagesProcessed') {
      downwardMessagesProcessed += downwardMessagesReceived;
      downwardMessagesReceived = 0;
    }
  }

  return {
    upwardMessageSent,
    downwardMessagesProcessed,
  };
}
