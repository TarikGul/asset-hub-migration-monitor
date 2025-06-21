import { db } from './index';
import { xcmMessageCounters, dmpMetricsCache } from './schema';
import { Log } from '../logging/Log';

export async function initializeDb() {
  const { logger } = Log;

  try {
    // Initialize XCM message counters for both chains
    const existingCounters = await db.query.xcmMessageCounters.findMany();
    logger.info('Existing counters:', existingCounters);

    // Initialize RC counter if it doesn't exist
    if (!existingCounters.find(c => c.sourceChain === 'relay-chain')) {
      logger.info('Initializing XCM message counter for relay-chain');
      await db.insert(xcmMessageCounters).values({
        sourceChain: 'relay-chain',
        destinationChain: 'asset-hub',
        messagesSent: 0,
        messagesProcessed: 0,
        messagesFailed: 0,
        lastUpdated: new Date(),
      });
    }

    // Initialize AH counter if it doesn't exist
    if (!existingCounters.find(c => c.sourceChain === 'asset-hub')) {
      logger.info('Initializing XCM message counter for asset-hub');
      await db.insert(xcmMessageCounters).values({
        sourceChain: 'asset-hub',
        destinationChain: 'relay-chain',
        messagesSent: 0,
        messagesProcessed: 0,
        messagesFailed: 0,
        lastUpdated: new Date(),
      });
    }

    // Initialize DMP metrics cache if it doesn't exist
    const existingDmpCache = await db.query.dmpMetricsCache.findFirst();
    if (!existingDmpCache) {
      logger.info('Initializing DMP metrics cache');
      await db.insert(dmpMetricsCache).values({
        currentQueueSize: 0,
        currentQueueSizeBytes: 0,
        averageLatencyMs: 0,
        averageThroughput: 0,
        averageThroughputBytes: 0,
        lastUpdated: new Date(),
      });
    }

    logger.info('Database initialization completed successfully');
  } catch (error) {
    logger.error('Error initializing database:', error);
    throw error;
  }
} 