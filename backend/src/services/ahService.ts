import { db } from '../db';
import { xcmMessageCounters, migrationStages } from '../db/schema';
import { sql, eq } from 'drizzle-orm';

import type { ITuple } from '@polkadot/types/types';
import type { u32 } from '@polkadot/types';
import { AbstractApi } from './abstractApi';
import { Log } from '../logging/Log';
import { eventService } from './eventService';
import { ApiPromise, WsProvider } from '@polkadot/api';
import type { Block } from '@polkadot/types/interfaces';
import { VoidFn } from '@polkadot/api/types';
import { getConfig } from '../config';

async function updateXcmMessageCountersViaEvents(upwardMessageSent: number, downwardMessagesProcessed: number) {
  const { logger } = Log;
  
  try {
    // Update the AH->RC counter with processed messages
    await db.update(xcmMessageCounters)
      .set({
        messagesProcessed: sql`${xcmMessageCounters.messagesProcessed} + ${downwardMessagesProcessed}`,
        messagesSent: sql`${xcmMessageCounters.messagesSent} + ${upwardMessageSent}`,
        lastUpdated: new Date(),
      })
      .where(eq(xcmMessageCounters.sourceChain, 'asset-hub'));

    // Get the updated counter
    const counter = await db.query.xcmMessageCounters.findFirst({
      where: (counters, { eq }) => eq(counters.sourceChain, 'asset-hub'),
    });

    if (counter) {
      const eventData = {
        sourceChain: counter.sourceChain,
        destinationChain: counter.destinationChain,
        messagesSent: counter.messagesSent,
        messagesProcessed: counter.messagesProcessed,
        messagesFailed: counter.messagesFailed,
        lastUpdated: counter.lastUpdated,
      };
      
      logger.info('Emitting ahXcmMessageCounter event with data:', eventData);
      eventService.emit('ahXcmMessageCounter', eventData);
    } else {
      logger.warn('No counter found after update');
    }

    logger.info(`Updated XCM message counter for asset-hub -> relay-chain: ${upwardMessageSent} upward, ${downwardMessagesProcessed} downward messages processed`);
  } catch (error) {
    logger.error('Error updating XCM message counter:', error);
  }
}

export const runAhHeadsService = async (): Promise<VoidFn> => {
  const provider = new WsProvider(getConfig().assetHubUrl);
  const api = await ApiPromise.create({ provider });
  const { logger } = Log;
  logger.info('Connected to Asset Hub');

  const unsubscribe = await api.rpc.chain.subscribeFinalizedHeads((header) => {
    const blockNumber = header.number.toNumber();
    const blockHash = header.hash.toString();

    logger.info(`New AH finalized head: #${blockNumber}`);

    // Emit the head event through eventService
    eventService.emit('ahHead', {
      blockNumber,
      blockHash,
      timestamp: new Date().toISOString()
    });
  });

  return unsubscribe;
};

export async function runAhMigrationStageService() {
  const { logger } = Log;
  const api = await AbstractApi.getInstance().getAssetHubApi();
  
  const unsubscribeMigrationStage = await api.query.ahMigrator.ahMigrationStage(async (migrationStage: any) => {
    try {
      const header = await api.rpc.chain.getHeader();
      
      await db.insert(migrationStages).values({
        chain: 'asset-hub',
        stage: migrationStage.type,
        details: JSON.stringify(migrationStage.toJSON()),
        blockNumber: header.number.toNumber(),
        blockHash: header.hash.toHex(),
      });

      eventService.emit('ahStageUpdate', {
        chain: 'asset-hub',
        stage: migrationStage.type,
        details: migrationStage.toJSON(),
        blockNumber: header.number.toNumber(),
        blockHash: header.hash.toHex(),
        timestamp: new Date().toISOString(),
      });

      logger.info('Asset Hub Migration stage updated:', {
        chain: 'asset-hub',
        stage: migrationStage.type,
        blockNumber: header.number.toNumber(),
      });
    } catch (error) {
      logger.error('Error processing migration stage:', error);
    }
  }) as unknown as VoidFn;

  return unsubscribeMigrationStage;
}

export async function findXcmMessages(api: ApiPromise, block: Block) {
  let upwardMessageSent = 0;
  let downwardMessagesReceived = 0;
  let downwardMessagesProcessed = 0;

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

async function updateXcmMessageCountersViaStorage(erroredOnAh: number) {
  const { logger } = Log;
  
  try {
    await db.update(xcmMessageCounters)
      .set({
        messagesFailed: erroredOnAh,
        lastUpdated: new Date(),
      })
      .where(eq(xcmMessageCounters.sourceChain, 'asset-hub'));

    // Get the updated counter
    const counterAh = await db.query.xcmMessageCounters.findFirst({
      where: (counters, { eq }) => eq(counters.sourceChain, 'asset-hub'),
    });

    if (counterAh) {
      const eventData = {
        sourceChain: counterAh.sourceChain,
        destinationChain: counterAh.destinationChain,
        messagesSent: counterAh.messagesSent,
        messagesProcessed: counterAh.messagesProcessed,
        messagesFailed: counterAh.messagesFailed,
        lastUpdated: counterAh.lastUpdated,
      };

      logger.info('Emitting ahXcmMessageCounter event with data:', eventData);
      eventService.emit('ahXcmMessageCounter', eventData);
    } else {
      logger.warn('No counter found after update');
    }
  } catch (error) {
    logger.error('Error updating XCM message counter:', error);
  }
}

export async function runAhXcmMessageCounterService() {
  const { logger } = Log;
  const api = await AbstractApi.getInstance().getAssetHubApi();

  const unsubscribeXcmMessages = await api.query.rcMigrator.dmpDataMessageCounts(async (messages: ITuple<[u32, u32]>) => {
    try {
      const [_, erroredOnAh] = messages;
      await updateXcmMessageCountersViaStorage(erroredOnAh.toNumber());
    } catch (error) {
      logger.error('Error processing XCM messages:', error);
    }
  }) as unknown as VoidFn;

  return unsubscribeXcmMessages;
}

export async function runAhFinalizedHeadsService() {
  const provider = new WsProvider(getConfig().assetHubUrl);
  const api = await ApiPromise.create({ provider });
  const { logger } = Log;
  logger.info('Connected to Asset Hub for finalized heads');

  const unsubscribe = await api.rpc.chain.subscribeFinalizedHeads((header) => {
    const blockNumber = header.number.toNumber();
    const blockHash = header.hash.toString();

    logger.info(`New AH finalized head: #${blockNumber}`);

    // Emit the head event through eventService
    eventService.emit('ahHead', {
      blockNumber,
      blockHash,
      timestamp: new Date().toISOString()
    });
  });

  return unsubscribe;
}
