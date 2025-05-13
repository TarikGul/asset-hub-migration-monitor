import type { PalletRcMigratorMigrationStage, PalletRcMigratorAccountsMigratedBalances } from '../types/pjs';
import type { u32 } from '@polkadot/types';
import type { ITuple } from '@polkadot/types/types';
import { db } from '../db';
import { migrationStages } from '../db/schema';
import { AbstractApi } from './abstractApi';
import { processBlock } from './xcmProcessing';
import { VoidFn } from '@polkadot/api/types';
import { eventService } from './eventService';
import { xcmMessageCounters } from '../db/schema';
import { Log } from '../logging/Log';
import { eq } from 'drizzle-orm';

interface RcHeadsServiceData {
  scheduledBlockNumber?: u32;
  skipAndStart?: boolean;
}

export async function runRcFinalizedHeadsService() {
  const { logger } = Log;
  const api = await AbstractApi.getInstance().getRelayChainApi();

  const unsubscribeFinalizedHeads = await api.rpc.chain.subscribeFinalizedHeads(async (header) => {
    const blockNumber = header.number.toNumber();
    logger.info(`New block #${blockNumber} detected`);
    eventService.emit('rcNewHead', { blockNumber });
  }) as unknown as VoidFn;

  return unsubscribeFinalizedHeads;
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

        // Process block for XCM messages
        const xcmMessages = await processBlock(api, block);
        if (xcmMessages.length > 0) {
          // TODO: Save to database
          // This will be pertinent when we want to track the contents of the messages.
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
        chain: 'relay-chain',
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

      if (!migrationStage.isPending) {
        eventService.emit('migrationScheduled', {
          skipAndStart: true
        });
        isMigrationScheduled = true;
        // TODO: Remove this once we have a way to detect if the migration has already started
        logger.info('Migration already started, enabling skip and start...');
      }

      eventService.emit('rcStageUpdate', {
        stage: migrationStage.type,
        chain: 'relay-chain',
        details: migrationStage.toJSON(),
        blockNumber: header.number.toNumber(),
        blockHash: header.hash.toHex(),
        timestamp: new Date().toISOString(),
      });

      logger.info('Migration stage updated:', {
        stage: migrationStage.type,
        chain: 'relay-chain',
        blockNumber: header.number.toNumber(),
      });
    } catch (error) {
      logger.info('Error processing migration stage:', error);
    }
  }) as unknown as VoidFn;

  return unsubscribeMigrationStage;
}

async function updateXcmMessageCounters(sentToAh: number, processedOnAh: number) {
  const { logger } = Log;
  
  try {
    // Update the RC->AH counter with processed messages
    await db.update(xcmMessageCounters)
      .set({
        messagesSent: sentToAh,
        lastUpdated: new Date(),
      })
      .where(eq(xcmMessageCounters.sourceChain, 'relay-chain'));

    await db.update(xcmMessageCounters)
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
      
      logger.info('Emitting rcXcmMessageCounter event with data:', eventData);
      eventService.emit('rcXcmMessageCounter', eventData);
    } else {
      logger.warn('No counter found after update');
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

      logger.info('Emitting ahXcmMessageCounter event with data:', eventData);
      eventService.emit('ahXcmMessageCounter', eventData);
    } else {
      logger.warn('No counter found after update');
    }

    logger.info(`Updated XCM message counter for relay-chain -> asset-hub: ${sentToAh} sent, ${processedOnAh} processed messages`);
  } catch (error) {
    logger.error('Error updating XCM message counter:', error);
  }
}

export async function runRcXcmMessageCounterService() {
  const { logger } = Log;
  const api = await AbstractApi.getInstance().getRelayChainApi();

  const unsubscribeXcmMessages = await api.query.rcMigrator.dmpDataMessageCounts(async (messages: ITuple<[u32, u32]>) => {
    try {
      const [sentToAh, processedOnAh] = messages;
      await updateXcmMessageCounters(sentToAh.toNumber(), processedOnAh.toNumber());
    } catch (error) {
      logger.error('Error processing XCM messages:', error);
    }
  }) as unknown as VoidFn;

  return unsubscribeXcmMessages;
}

export async function runRcBalancesService() {
  const api = await AbstractApi.getInstance().getRelayChainApi();

  const unsubscribeAccountsMigration = await api.query.rcMigrator.rcMigratedBalance(async (balances: PalletRcMigratorAccountsMigratedBalances) => {
    eventService.emit('rcBalances', {
      kept: balances.kept.toString(),
      migrated: balances.migrated.toString(),
    });
  }) as unknown as VoidFn;

  return unsubscribeAccountsMigration;
}
