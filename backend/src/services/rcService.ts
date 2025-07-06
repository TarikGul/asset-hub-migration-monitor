import type {
  PalletRcMigratorMigrationStage,
  PalletRcMigratorAccountsMigratedBalances,
} from '../types/pjs';
import type { u32, Vec } from '@polkadot/types';
import type { PolkadotCorePrimitivesInboundDownwardMessage } from '@polkadot/types/lookup';
import type { ITuple } from '@polkadot/types/types';

import { ApiPromise, WsProvider } from '@polkadot/api';
import { VoidFn } from '@polkadot/api/types';
import { eq, desc } from 'drizzle-orm';

import { getConfig } from '../config';
import { db } from '../db';
import {
  migrationStages,
  dmpQueueEvents,
  xcmMessageCounters,
  messageProcessingEventsRC,
} from '../db/schema';
import { Log } from '../logging/Log';

import { AbstractApi } from './abstractApi';
import { eventService } from './eventService';
import { UmpLatencyProcessor } from './cache/UmpLatencyProcessor';
import { DmpLatencyProcessor } from './cache/DmpLatencyProcessor';
import { SubscriptionManager } from '../util/SubscriptionManager';

export async function runRcNewHeadsService() {
  const provider = new WsProvider(getConfig().relayChainUrl);
  const api = await ApiPromise.create({ provider });
  Log.connection({
    service: 'Relay Chain New Heads',
    status: 'connected',
  });

  const unsubscribe = await api.rpc.chain.subscribeNewHeads(header => {
    const blockNumber = header.number.toNumber();
    const blockHash = header.hash.toString();

    const subManager = SubscriptionManager.getInstance();

    if (
      !subManager.allSubsInitialized &&
      subManager.migrationStartBlockNumber && 
      subManager.migrationStartBlockNumber - blockNumber === 3// Start 3 blocks early to ensure we don't miss any events.
    ) {
      subManager.initAllMigrationSubs();
    } else if (subManager.migrationStarted && !subManager.allSubsInitialized) {
      subManager.initAllMigrationSubs();
    }

    Log.chainEvent({
      chain: 'relay-chain',
      eventType: 'new head',
      blockNumber,
      blockHash,
      details: { timestamp: new Date().toISOString() },
    });

    // Emit the head event through eventService
    eventService.emit('rcHead', {
      blockNumber,
      blockHash,
      timestamp: new Date().toISOString(),
    });
  });

  return unsubscribe;
}

export async function runRcMigrationStageService(): Promise<VoidFn> {
  const api = await AbstractApi.getInstance().getRelayChainApi();

  const unsubscribeMigrationStage = (await api.query.rcMigrator.rcMigrationStage(
    async (migrationStage: PalletRcMigratorMigrationStage) => {
      try {
        // TODO: Technically we want to confirm this is the block that has the proper migration stage in the events
        const header = await api.rpc.chain.getHeader();

        await db.insert(migrationStages).values({
          stage: migrationStage.type,
          chain: 'relay-chain',
          details: JSON.stringify(migrationStage.toJSON()),
          scheduledBlockNumber: migrationStage.isScheduled ? migrationStage.asScheduled.blockNumber.toNumber() : undefined,
          blockNumber: header.number.toNumber(),
          blockHash: header.hash.toHex(),
        });

        if (migrationStage.isScheduled) {
          const subManager = SubscriptionManager.getInstance();
          subManager.setMigrationBlockNumber(migrationStage.asScheduled.blockNumber.toNumber());
        }

        eventService.emit('rcStageUpdate', {
          stage: migrationStage.type,
          chain: 'relay-chain',
          details: migrationStage.toJSON(),
          blockNumber: header.number.toNumber(),
          blockHash: header.hash.toHex(),
          timestamp: new Date().toISOString(),
        });

        Log.chainEvent({
          chain: 'relay-chain',
          eventType: 'migration stage update',
          blockNumber: header.number.toNumber(),
          blockHash: header.hash.toHex(),
          details: { stage: migrationStage.type },
        });
      } catch (error) {
        Log.chainEvent({
          chain: 'relay-chain',
          eventType: 'migration stage processing error',
          error: error as Error,
        });
      }
    }
  )) as unknown as VoidFn;

  return unsubscribeMigrationStage;
}

async function updateXcmMessageCounters(sentToAh: number, processedOnAh: number) {
  try {
    // Update the RC->AH counter with processed messages
    await db
      .update(xcmMessageCounters)
      .set({
        messagesSent: sentToAh,
        lastUpdated: new Date(),
      })
      .where(eq(xcmMessageCounters.sourceChain, 'relay-chain'));

    await db
      .update(xcmMessageCounters)
      .set({
        messagesProcessed: processedOnAh,
        lastUpdated: new Date(),
      })
      .where(eq(xcmMessageCounters.sourceChain, 'asset-hub'));

    // Get the updated counter
    const counterRc = await db.query.xcmMessageCounters.findFirst({
      where: (counters, { eq }) => eq(counters.sourceChain, 'relay-chain'),
    });

    // Get the updated counter
    const counterAh = await db.query.xcmMessageCounters.findFirst({
      where: (counters, { eq }) => eq(counters.sourceChain, 'asset-hub'),
    });

    if (counterRc) {
      const eventData = {
        sourceChain: counterRc.sourceChain,
        destinationChain: counterRc.destinationChain,
        messagesSent: counterRc.messagesSent,
        messagesProcessed: counterRc.messagesProcessed,
        messagesFailed: counterRc.messagesFailed,
        lastUpdated: counterRc.lastUpdated,
      };

      Log.service({
        service: 'XCM Message Counter',
        action: 'Emitting rcXcmMessageCounter event',
        details: eventData,
      });
      eventService.emit('rcXcmMessageCounter', eventData);
    } else {
      Log.service({
        service: 'XCM Message Counter',
        action: 'No RC counter found after update',
        details: { sourceChain: 'relay-chain' },
      });
    }

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
        action: 'Emitting ahXcmMessageCounter event',
        details: eventData,
      });
      eventService.emit('ahXcmMessageCounter', eventData);
    } else {
      Log.service({
        service: 'XCM Message Counter',
        action: 'No AH counter found after update',
        details: { sourceChain: 'asset-hub' },
      });
    }

    Log.service({
      service: 'XCM Message Counter',
      action: 'Updated counters',
      details: { sentToAh, processedOnAh },
    });
  } catch (error) {
    Log.service({
      service: 'XCM Message Counter',
      action: 'Error updating counters',
      error: error as Error,
    });
  }
}

export async function runRcXcmMessageCounterService() {
  const api = await AbstractApi.getInstance().getRelayChainApi();

  const unsubscribeXcmMessages = (await api.query.rcMigrator.dmpDataMessageCounts(
    async (messages: ITuple<[u32, u32]>) => {
      try {
        const [sentToAh, processedOnAh] = messages;
        await updateXcmMessageCounters(sentToAh.toNumber(), processedOnAh.toNumber());
      } catch (error) {
        Log.chainEvent({
          chain: 'relay-chain',
          eventType: 'XCM message processing error',
          error: error as Error,
        });
      }
    }
  )) as unknown as VoidFn;

  return unsubscribeXcmMessages;
}

export async function runRcDmpDataMessageCountsService() {
  const api = await AbstractApi.getInstance().getRelayChainApi();
  const dmpLatencyProcessor = DmpLatencyProcessor.getInstance();

  let previousQueueSize = 0;

  const unsubscribeDmpDataMessageCounts = (await api.query.dmp.downwardMessageQueues(
    1000,
    async (messages: Vec<PolkadotCorePrimitivesInboundDownwardMessage>) => {
      try {
        const currentQueueSize = messages.length;
        const header = await api.rpc.chain.getHeader();

        // Calculate exact total size in bytes by summing encoded lengths
        let totalSizeBytes = 0;
        for (const message of messages) {
          totalSizeBytes += message.msg.encodedLength;
        }

        // Determine event type based on size change
        let eventType = 'no_change';
        if (currentQueueSize > previousQueueSize) {
          eventType = 'fill';
        } else if (currentQueueSize < previousQueueSize) {
          eventType = currentQueueSize === 0 ? 'drain' : 'partial_drain';
        }

        // Only record if there's an actual change
        if (eventType !== 'no_change') {
          const timestamp = new Date();
          const blockNumber = header.number.toNumber();

          await db.insert(dmpQueueEvents).values({
            queueSize: currentQueueSize,
            totalSizeBytes,
            eventType,
            blockNumber,
            timestamp,
          });

          // Add fill events to latency processor
          if (eventType === 'fill') {
            dmpLatencyProcessor.addFillMessageSent(blockNumber, timestamp);
          }

          // Emit event for frontend
          eventService.emit('dmpQueueEvent', {
            queueSize: currentQueueSize,
            totalSizeBytes,
            eventType,
            blockNumber,
            timestamp: timestamp.toISOString(),
          });

          Log.chainEvent({
            chain: 'relay-chain',
            eventType: `DMP queue ${eventType}`,
            blockNumber: header.number.toNumber(),
            blockHash: header.hash.toString(),
            details: {
              queueSize: currentQueueSize,
              totalSizeBytes,
              previousSize: previousQueueSize,
              change: currentQueueSize - previousQueueSize,
            },
          });
        }

        previousQueueSize = currentQueueSize;
      } catch (error) {
        Log.chainEvent({
          chain: 'relay-chain',
          eventType: 'DMP queue processing error',
          error: error as Error,
        });
      }
    }
  )) as unknown as VoidFn;

  return unsubscribeDmpDataMessageCounts;
}

export async function runRcMessageQueueProcessedService() {
  const api = await AbstractApi.getInstance().getRelayChainApi();
  const umpLatencyProcessor = UmpLatencyProcessor.getInstance();

  const unsubscribe = await api.query.system.events(async events => {
    for (const record of events) {
      const { event } = record;
      if (event.section === 'messageQueue' && event.method === 'Processed') {
        try {
          const header = await api.rpc.chain.getHeader();
          const blockNumber = header.number.toNumber();
          const timestamp = new Date();

          // Save to database
          await db.insert(messageProcessingEventsRC).values({
            blockNumber,
            timestamp,
          });

          // Add to latency processor
          umpLatencyProcessor.addMessageQueueProcessed(blockNumber, timestamp);

          Log.chainEvent({
            chain: 'relay-chain',
            eventType: 'MessageQueue.Processed',
            blockNumber,
            details: {
              eventData: event.toJSON(),
            },
          });
        } catch (error) {
          Log.chainEvent({
            chain: 'relay-chain',
            eventType: 'MessageQueue.Processed database error',
            error: error as Error,
          });
        }
      }
    }
  });

  return unsubscribe;
}
