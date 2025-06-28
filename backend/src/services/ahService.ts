import { db } from '../db';
import { xcmMessageCounters, migrationStages, messageProcessingEventsAH, dmpQueueEvents } from '../db/schema';
import { sql, eq, desc } from 'drizzle-orm';

import type { ITuple } from '@polkadot/types/types';
import type { u32 } from '@polkadot/types';
import { AbstractApi } from './abstractApi';
import { Log } from '../logging/Log';
import { eventService } from './eventService';
import { ApiPromise, WsProvider } from '@polkadot/api';
import type { Block } from '@polkadot/types/interfaces';
import { VoidFn } from '@polkadot/api/types';
import { getConfig } from '../config';
import type { Vec } from '@polkadot/types';

export const runAhHeadsService = async (): Promise<VoidFn> => {
  const provider = new WsProvider(getConfig().assetHubUrl);
  const api = await ApiPromise.create({ provider });
  Log.connection({
    service: 'Asset Hub Heads',
    status: 'connected'
  });

  const unsubscribe = await api.rpc.chain.subscribeFinalizedHeads((header) => {
    const blockNumber = header.number.toNumber();
    const blockHash = header.hash.toString();

    Log.chainEvent({
      chain: 'asset-hub',
      eventType: 'finalized head',
      blockNumber,
      blockHash,
      details: { timestamp: new Date().toISOString() }
    });

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

      Log.chainEvent({
        chain: 'asset-hub',
        eventType: 'migration stage update',
        blockNumber: header.number.toNumber(),
        blockHash: header.hash.toHex(),
        details: { stage: migrationStage.type }
      });
    } catch (error) {
      Log.chainEvent({
        chain: 'asset-hub',
        eventType: 'migration stage processing error',
        error: error as Error
      });
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

      Log.service({
        service: 'XCM Message Counter',
        action: 'Emitting ahXcmMessageCounter event via storage',
        details: eventData
      });
      eventService.emit('ahXcmMessageCounter', eventData);
    } else {
      Log.service({
        service: 'XCM Message Counter',
        action: 'No counter found after storage update',
        details: { sourceChain: 'asset-hub' }
      });
    }
  } catch (error) {
    Log.service({
      service: 'XCM Message Counter',
      action: 'Error updating counters via storage',
      error: error as Error
    });
  }
}

export async function runAhXcmMessageCounterService() {
  const api = await AbstractApi.getInstance().getAssetHubApi();

  const unsubscribeXcmMessages = await api.query.ahMigrator.dmpDataMessageCounts(async (messages: ITuple<[u32, u32]>) => {
    try {
      const [_, erroredOnAh] = messages;
      await updateXcmMessageCountersViaStorage(erroredOnAh.toNumber());
    } catch (error) {
      Log.chainEvent({
        chain: 'asset-hub',
        eventType: 'XCM message processing error',
        error: error as Error
      });
    }
  }) as unknown as VoidFn;

  return unsubscribeXcmMessages;
}

export async function runAhFinalizedHeadsService() {
  const provider = new WsProvider(getConfig().assetHubUrl);
  const api = await ApiPromise.create({ provider });
  Log.connection({
    service: 'Asset Hub Finalized Heads',
    status: 'connected'
  });

  const unsubscribe = await api.rpc.chain.subscribeFinalizedHeads((header) => {
    const blockNumber = header.number.toNumber();
    const blockHash = header.hash.toString();

    Log.chainEvent({
      chain: 'asset-hub',
      eventType: 'finalized head',
      blockNumber,
      blockHash,
      details: { timestamp: new Date().toISOString() }
    });

    // Emit the head event through eventService
    eventService.emit('ahHead', {
      blockNumber,
      blockHash,
      timestamp: new Date().toISOString()
    });
  });

  return unsubscribe;
}
// TODO: This service should also be aggregating events for the pre-pallet statuses.
// We need to ensure that it checks for messageQueue first to ensure we get as accurate latency reports as possible.
// This means we need to store and organize all the events locally, send them to some function to batch all the events to the db.
export async function runAhEventsService() {
  const api = await AbstractApi.getInstance().getAssetHubApi();

  const unsubscribe = await api.query.system.events(async (events) => {
    for (const record of events) {
      const { event } = record;
      if (event.section === 'messageQueue' && event.method === 'Processed') {
        try {
          // Get current block information
          const header = await api.rpc.chain.getHeader();
          const blockNumber = header.number.toNumber();
          
          // Before inserting to DB, calculate latency
          const lastFillEvent = await db.query.dmpQueueEvents.findFirst({
            where: eq(dmpQueueEvents.eventType, 'fill'),
            orderBy: [desc(dmpQueueEvents.timestamp)]
          });

          let latencyMs = 0;
          if (lastFillEvent && lastFillEvent.timestamp) {
            const processingTimestamp = new Date();
            latencyMs = processingTimestamp.getTime() - lastFillEvent.timestamp.getTime();
          }

          // Emit latency event
          eventService.emit('dmpLatency', {
            latencyMs,
            blockNumber,
            timestamp: new Date().toISOString(),
          });

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
              latencyMs 
            }
          });

        } catch (error) {
          Log.chainEvent({
            chain: 'asset-hub',
            eventType: 'MessageQueue.Processed database error',
            error: error as Error
          });
        }
      }
    }
  })

  return unsubscribe;
}
