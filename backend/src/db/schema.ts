import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Migration Stages
export const migrationStages = sqliteTable('migration_stages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  stage: text('stage').notNull(),
  details: text('details'), // JSON stringified details about the stage
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
  lastUpdated: integer('last_updated', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Balance Migration Counters
export const balanceMigrationCounters = sqliteTable('balance_migration_counters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountsMigrated: integer('accounts_migrated').notNull().default(0),
  totalBalanceMigrated: integer('total_balance_migrated').notNull().default(0),
  totalBalanceKept: integer('total_balance_kept').notNull().default(0),
  failedMigrations: integer('failed_migrations').notNull().default(0),
  lastUpdated: integer('last_updated', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Teleportation Counters
export const teleportationCounters = sqliteTable('teleportation_counters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  totalMints: integer('total_mints').notNull().default(0),
  totalBurns: integer('total_burns').notNull().default(0),
  totalMintAmount: integer('total_mint_amount').notNull().default(0),
  totalBurnAmount: integer('total_burn_amount').notNull().default(0),
  failedOperations: integer('failed_operations').notNull().default(0),
  lastUpdated: integer('last_updated', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Pallet Migration Counters
export const palletMigrationCounters = sqliteTable('pallet_migration_counters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  palletName: text('pallet_name').notNull(),
  stageId: integer('stage_id').notNull().references(() => migrationStages.id),
  itemsProcessed: integer('items_processed').notNull().default(0),
  totalItems: integer('total_items').notNull().default(0),
  failedItems: integer('failed_items').notNull().default(0),
  lastUpdated: integer('last_updated', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
