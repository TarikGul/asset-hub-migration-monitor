import type { Bytes, u32, Vec } from '@polkadot/types';
import type { Block } from '@polkadot/types/interfaces';
import type { ITuple } from '@polkadot/types/types';

import { ApiPromise, WsProvider } from '@polkadot/api';
import { VoidFn } from '@polkadot/api/types';
import { sql, eq, desc } from 'drizzle-orm';

import { getConfig } from '../config';
import { db } from '../db';
import {
  xcmMessageCounters,
  migrationStages,
  messageProcessingEventsAH,
  dmpQueueEvents,
  umpQueueEvents,
  upwardMessageSentEvents,
} from '../db/schema';
import { Log } from '../logging/Log';

import { AbstractApi } from './abstractApi';
import { DmpMetricsCache } from './cache/DmpMetricsCache';
import { eventService } from './eventService';
import { UmpLatencyProcessor } from './cache/UmpLatencyProcessor';
import { DmpLatencyProcessor } from './cache/DmpLatencyProcessor';

// Get shared instance of DMP metrics cache
const dmpMetricsCacheInstance = DmpMetricsCache.getInstance();
const dmpLatencyProcessor = DmpLatencyProcessor.getInstance();

export const runAhHeadsService = async (): Promise<VoidFn> => {
  const provider = new WsProvider(getConfig().assetHubUrl);
  const api = await ApiPromise.create({ provider });
  Log.connection({
    service: 'Asset Hub Heads',
    status: 'connected',
  });

  const unsubscribe = await api.rpc.chain.subscribeFinalizedHeads(header => {
    const blockNumber = header.number.toNumber();
    const blockHash = header.hash.toString();

    Log.chainEvent({
      chain: 'asset-hub',
      eventType: 'finalized head',
      blockNumber,
      blockHash,
      details: { timestamp: new Date().toISOString() },
    });

    // Emit the head event through eventService
    eventService.emit('ahHead', {
      blockNumber,
      blockHash,
      timestamp: new Date().toISOString(),
    });
  });

  return unsubscribe;
};

export async function runAhMigrationStageService() {
  const api = await AbstractApi.getInstance().getAssetHubApi();

  const unsubscribeMigrationStage = (await api.query.ahMigrator.ahMigrationStage(
    async (migrationStage: any) => {
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

        Log.chainEvent({
          chain: 'asset-hub',
          eventType: 'migration stage update',
          blockNumber: header.number.toNumber(),
          blockHash: header.hash.toHex(),
          details: { stage: migrationStage.type },
        });
      } catch (error) {
        Log.chainEvent({
          chain: 'asset-hub',
          eventType: 'migration stage processing error',
          error: error as Error,
        });
      }
    }
  )) as unknown as VoidFn;

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
  try {
    await db
      .update(xcmMessageCounters)
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

      Log.service({
        service: 'XCM Message Counter',
        action: 'Emitting ahXcmMessageCounter event via storage',
        details: eventData,
      });
      eventService.emit('ahXcmMessageCounter', eventData);
    } else {
      Log.service({
        service: 'XCM Message Counter',
        action: 'No counter found after storage update',
        details: { sourceChain: 'asset-hub' },
      });
    }
  } catch (error) {
    Log.service({
      service: 'XCM Message Counter',
      action: 'Error updating counters via storage',
      error: error as Error,
    });
  }
}

export async function runAhXcmMessageCounterService() {
  const api = await AbstractApi.getInstance().getAssetHubApi();

  const unsubscribeXcmMessages = (await api.query.ahMigrator.dmpDataMessageCounts(
    async (messages: ITuple<[u32, u32]>) => {
      try {
        const [_, erroredOnAh] = messages;
        await updateXcmMessageCountersViaStorage(erroredOnAh.toNumber());
      } catch (error) {
        Log.chainEvent({
          chain: 'asset-hub',
          eventType: 'XCM message processing error',
          error: error as Error,
        });
      }
    }
  )) as unknown as VoidFn;

  return unsubscribeXcmMessages;
}

export async function runAhFinalizedHeadsService() {
  const provider = new WsProvider(getConfig().assetHubUrl);
  const api = await ApiPromise.create({ provider });
  Log.connection({
    service: 'Asset Hub Finalized Heads',
    status: 'connected',
  });

  const unsubscribe = await api.rpc.chain.subscribeFinalizedHeads(header => {
    const blockNumber = header.number.toNumber();
    const blockHash = header.hash.toString();

    Log.chainEvent({
      chain: 'asset-hub',
      eventType: 'finalized head',
      blockNumber,
      blockHash,
      details: { timestamp: new Date().toISOString() },
    });

    // Emit the head event through eventService
    eventService.emit('ahHead', {
      blockNumber,
      blockHash,
      timestamp: new Date().toISOString(),
    });
  });

  return unsubscribe;
}
// TODO: This service should also be aggregating events for the pre-pallet statuses.
// We need to ensure that it checks for messageQueue first to ensure we get as accurate latency reports as possible.
// This means we need to store and organize all the events locally, send them to some function to batch all the events to the db.
export async function runAhEventsService() {
  const api = await AbstractApi.getInstance().getAssetHubApi();
  let lastProcessedBlock = 0; // Track the last block we processed

  const unsubscribe = await api.query.system.events(async events => {
    for (const record of events) {
      const { event } = record;
      if (event.section === 'messageQueue' && event.method === 'Processed') {
        try {
          // Get current block information
          const header = await api.rpc.chain.getHeader();
          const blockNumber = header.number.toNumber();

          // Only process if this is a new block (avoid duplicate processing in same block)
          if (blockNumber <= lastProcessedBlock) {
            continue;
          }
          lastProcessedBlock = blockNumber;

          // Add to DMP latency processor
          const timestamp = new Date();
          dmpLatencyProcessor.addMessageQueueProcessed(blockNumber, timestamp);

          // Save to database
          await db.insert(messageProcessingEventsAH).values({
            blockNumber,
            timestamp: new Date(),
          });

          Log.chainEvent({
            chain: 'asset-hub',
            eventType: 'MessageQueue.Processed',
            blockNumber,
            details: {
              eventData: event.toJSON(),
            },
          });
        } catch (error) {
          Log.chainEvent({
            chain: 'asset-hub',
            eventType: 'MessageQueue.Processed database error',
            error: error as Error,
          });
        }
      }

      if (event.section === 'parachainSystem' && event.method === 'UpwardMessageSent') {
        try {
          const header = await api.rpc.chain.getHeader();
          const blockNumber = header.number.toNumber();
          const timestamp = new Date();

          await db.insert(upwardMessageSentEvents).values({
            blockNumber,
            timestamp,
          });

          // Add to latency processor
          const umpLatencyProcessor = UmpLatencyProcessor.getInstance();
          umpLatencyProcessor.addUpwardMessageSent(blockNumber, timestamp);

          eventService.emit('upwardMessageSent', {
            timestamp: timestamp.toISOString(),
          });

          Log.chainEvent({
            chain: 'asset-hub',
            eventType: 'UpwardMessageSent',
            blockNumber,
            details: {
              eventData: event.toJSON(),
            },
          });
        } catch (error) {
          Log.chainEvent({  
            chain: 'asset-hub',
            eventType: 'UpwardMessageSent database error',
            error: error as Error,
          });
        }
      }
    }
  });

  return unsubscribe;
}

export async function runAhUmpPendingMessagesService() {
  const api = await AbstractApi.getInstance().getAssetHubApi();

  const unsubscribe = (await api.query.parachainSystem.pendingUpwardMessages(
    async (messages: Vec<Bytes>) => {
      try {
        let totalSizeBytes = 0;
        for (const message of messages) {
          const messageSize = message.length;
          totalSizeBytes += messageSize;
        }

        const header = await api.rpc.chain.getHeader();
        const blockNumber = header.number.toNumber();

        await db.insert(umpQueueEvents).values({
          queueSize: messages.length,
          totalSizeBytes,
          blockNumber,
          timestamp: new Date(),
        });

        eventService.emit('umpQueueEvent', {
          queueSize: messages.length,
          totalSizeBytes,
          blockNumber,
          timestamp: new Date().toISOString(),
        });

        Log.service({
          service: 'Asset Hub UMP',
          action: 'UMP queue event recorded',
          details: { queueSize: messages.length, totalSizeBytes, blockNumber },
        });
      } catch (error) {
        Log.service({
          service: 'Asset Hub UMP',
          action: 'Error processing UMP pending messages',
          error: error as Error,
        });
      }
    }
  )) as unknown as VoidFn;

  return unsubscribe;
}
