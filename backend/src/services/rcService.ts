import type {
  PalletRcMigratorMigrationStage,
  PalletRcMigratorAccountsMigratedBalances,
} from '../types/pjs';
import type { u32, Vec } from '@polkadot/types';
import type { PolkadotCorePrimitivesInboundDownwardMessage } from '@polkadot/types/lookup';
import type { ITuple } from '@polkadot/types/types';

import { ApiPromise, WsProvider } from '@polkadot/api';
import { VoidFn } from '@polkadot/api/types';
import { eq } from 'drizzle-orm';

import { getConfig } from '../config';
import { db } from '../db';
import { migrationStages, dmpQueueEvents, dmpMetricsCache , xcmMessageCounters } from '../db/schema';
import { Log } from '../logging/Log';


import { AbstractApi } from './abstractApi';
import { DmpMetricsCache } from './cache/Cache';
import { eventService } from './eventService';

// Get shared instance of DMP metrics cache
const dmpMetricsCacheInstance = DmpMetricsCache.getInstance();

export async function runRcFinalizedHeadsService() {
  const provider = new WsProvider(getConfig().relayChainUrl);
  const api = await ApiPromise.create({ provider });
  Log.connection({
    service: 'Relay Chain Finalized Heads',
    status: 'connected',
  });

  const unsubscribe = await api.rpc.chain.subscribeFinalizedHeads(header => {
    const blockNumber = header.number.toNumber();
    const blockHash = header.hash.toString();

    Log.chainEvent({
      chain: 'relay-chain',
      eventType: 'finalized head',
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

export const runRcHeadsService = async (scheduledBlockNumber?: number): Promise<VoidFn> => {
  const provider = new WsProvider(getConfig().relayChainUrl);
  const api = await ApiPromise.create({ provider });
  Log.connection({
    service: 'Relay Chain Heads',
    status: 'connected',
  });

  const unsubscribe = await api.rpc.chain.subscribeFinalizedHeads(header => {
    const blockNumber = header.number.toNumber();
    const blockHash = header.hash.toString();

    Log.chainEvent({
      chain: 'relay-chain',
      eventType: 'finalized head',
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

    if (scheduledBlockNumber && blockNumber >= scheduledBlockNumber) {
      Log.service({
        service: 'Relay Chain Heads',
        action: 'Reached scheduled block',
        details: { scheduledBlockNumber, currentBlock: blockNumber },
      });
      unsubscribe();
    }
  });

  return unsubscribe;
};

export async function runRcMigrationStageService(): Promise<VoidFn> {
  const api = await AbstractApi.getInstance().getRelayChainApi();

  const unsubscribeMigrationStage = (await api.query.rcMigrator.rcMigrationStage(
    async (migrationStage: PalletRcMigratorMigrationStage) => {
      let isMigrationScheduled = false;
      try {
        // TODO: Technically we want to confirm this is the block that has the proper migration stage in the events
        const header = await api.rpc.chain.getHeader();

        await db.insert(migrationStages).values({
          stage: migrationStage.type,
          chain: 'relay-chain',
          details: JSON.stringify(migrationStage.toJSON()),
          blockNumber: header.number.toNumber(),
          blockHash: header.hash.toHex(),
        });

        // If we receive a Scheduled stage, emit an event with the block number
        if (migrationStage.isScheduled && !isMigrationScheduled) {
          const scheduledBlock = migrationStage.asScheduled.blockNumber;
          eventService.emit('migrationScheduled', {
            scheduledBlock,
          });
          isMigrationScheduled = true;
          Log.service({
            service: 'Migration Stage',
            action: 'Migration scheduled',
            details: { scheduledBlock: scheduledBlock.toNumber() },
          });
        }

        if (!migrationStage.isPending) {
          eventService.emit('migrationScheduled', {
            skipAndStart: true,
          });
          isMigrationScheduled = true;
          // TODO: Remove this once we have a way to detect if the migration has already started
          Log.service({
            service: 'Migration Stage',
            action: 'Migration already started, enabling skip and start',
          });
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

export async function runRcBalancesService() {
  const api = await AbstractApi.getInstance().getRelayChainApi();

  const unsubscribeAccountsMigration = (await api.query.rcMigrator.rcMigratedBalance(
    async (balances: PalletRcMigratorAccountsMigratedBalances) => {
      eventService.emit('rcBalances', {
        kept: balances.kept.toString(),
        migrated: balances.migrated.toString(),
      });
    }
  )) as unknown as VoidFn;

  return unsubscribeAccountsMigration;
}

export async function runRcDmpDataMessageCountsService() {
  const api = await AbstractApi.getInstance().getRelayChainApi();

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
          await db.insert(dmpQueueEvents).values({
            queueSize: currentQueueSize,
            totalSizeBytes,
            eventType,
            blockNumber: header.number.toNumber(),
            timestamp: new Date(),
          });

          // Emit event for frontend
          eventService.emit('dmpQueueEvent', {
            queueSize: currentQueueSize,
            totalSizeBytes,
            eventType,
            blockNumber: header.number.toNumber(),
            timestamp: new Date().toISOString(),
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
