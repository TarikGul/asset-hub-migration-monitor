import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Migration Stages
export const migrationStages = sqliteTable('migration_stages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  stageName: text('stage_name').notNull(),
  status: text('status', { enum: ['pending', 'ongoing', 'completed', 'failed'] }).notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  errorCount: integer('error_count').notNull().default(0),
  lastUpdated: integer('last_updated', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

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
