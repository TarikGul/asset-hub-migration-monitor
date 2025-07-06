import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Migration Stages
export const migrationStages = sqliteTable('migration_stages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chain: text('chain').notNull(), // 'asset-hub' or 'relay-chain'
  stage: text('stage').notNull(),
  details: text('details'), // JSON stringified details about the stage
  scheduledBlockNumber: integer('scheduled_block_number'), // Only used for scheduled stages.
  blockNumber: integer('block_number').notNull(),
  blockHash: text('block_hash').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export type MigrationStage = typeof migrationStages.$inferSelect;
export type NewMigrationStage = typeof migrationStages.$inferInsert;

// XCM Message Counters
export const xcmMessageCounters = sqliteTable('xcm_message_counters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceChain: text('source_chain').notNull(),
  destinationChain: text('destination_chain').notNull(),
  messagesSent: integer('messages_sent').notNull().default(0),
  messagesProcessed: integer('messages_processed').notNull().default(0),
  messagesFailed: integer('messages_failed').notNull().default(0),
  lastUpdated: integer('last_updated', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Teleportation Counters
export const teleportationCounters = sqliteTable('teleportation_counters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  totalMints: integer('total_mints').notNull().default(0),
  totalBurns: integer('total_burns').notNull().default(0),
  totalMintAmount: integer('total_mint_amount').notNull().default(0),
  totalBurnAmount: integer('total_burn_amount').notNull().default(0),
  failedOperations: integer('failed_operations').notNull().default(0),
  lastUpdated: integer('last_updated', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Pallet Migration Counters
export const palletMigrationCounters = sqliteTable('pallet_migration_counters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  palletName: text('pallet_name').notNull(),
  stageId: integer('stage_id')
    .notNull()
    .references(() => migrationStages.id),
  itemsProcessed: integer('items_processed').notNull().default(0),
  totalItems: integer('total_items').notNull().default(0),
  failedItems: integer('failed_items').notNull().default(0),
  lastUpdated: integer('last_updated', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// DMP Queue State Changes
export const dmpQueueEvents = sqliteTable('dmp_queue_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  queueSize: integer('queue_size').notNull(), // Number of messages in queue
  totalSizeBytes: integer('total_size_bytes').notNull().default(0), // Total size in bytes
  eventType: text('event_type').notNull(), // 'fill', 'drain', 'partial_drain'
  blockNumber: integer('block_number').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// UMP Queue State Changes
export const umpQueueEvents = sqliteTable('ump_queue_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  queueSize: integer('queue_size').notNull(), // Number of messages in queue
  totalSizeBytes: integer('total_size_bytes').notNull().default(0), // Total size in bytes
  blockNumber: integer('block_number').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Message Processing Events (from Asset Hub)
export const messageProcessingEventsRC = sqliteTable('message_processing_events_rc', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  blockNumber: integer('block_number').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Message Processing Events (from Asset Hub)
export const messageProcessingEventsAH = sqliteTable('message_processing_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  blockNumber: integer('block_number').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Upward Message Sent Events (from Asset Hub)
export const upwardMessageSentEvents = sqliteTable('upward_message_sent_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  blockNumber: integer('block_number').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Queue-Processing Correlation
export const queueProcessingCorrelation = sqliteTable('queue_processing_correlation', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  queueEventId: integer('queue_event_id')
    .notNull()
    .references(() => dmpQueueEvents.id),
  processingEventId: integer('processing_event_id')
    .notNull()
    .references(() => messageProcessingEventsAH.id),
  latencyMs: integer('latency_ms').notNull(), // Time between queue drain and processing
  throughput: integer('throughput').notNull(), // Messages per second
  throughputBytes: integer('throughput_bytes').notNull(), // Bytes per second
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Cached DMP Metrics for quick frontend queries
export const dmpMetricsCache = sqliteTable('dmp_metrics_cache', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  currentQueueSize: integer('current_queue_size').notNull().default(0),
  currentQueueSizeBytes: integer('current_queue_size_bytes').notNull().default(0),
  averageLatencyMs: integer('average_latency_ms').notNull().default(0),
  averageThroughput: integer('average_throughput').notNull().default(0),
  averageThroughputBytes: integer('average_throughput_bytes').notNull().default(0),
  lastUpdated: integer('last_updated', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type DmpQueueEvent = typeof dmpQueueEvents.$inferSelect;
export type NewDmpQueueEvent = typeof dmpQueueEvents.$inferInsert;

export type UmpQueueEvent = typeof umpQueueEvents.$inferSelect;
export type NewUmpQueueEvent = typeof umpQueueEvents.$inferInsert;

export type MessageProcessingEventAH = typeof messageProcessingEventsAH.$inferSelect;
export type NewMessageProcessingEvent = typeof messageProcessingEventsAH.$inferInsert;

export type QueueProcessingCorrelation = typeof queueProcessingCorrelation.$inferSelect;
export type NewQueueProcessingCorrelation = typeof queueProcessingCorrelation.$inferInsert;

export type DmpMetricsCache = typeof dmpMetricsCache.$inferSelect;
export type NewDmpMetricsCache = typeof dmpMetricsCache.$inferInsert;

export type UpwardMessageSentEvent = typeof upwardMessageSentEvents.$inferSelect;
export type NewUpwardMessageSentEvent = typeof upwardMessageSentEvents.$inferInsert;
