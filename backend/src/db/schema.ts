import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';

export const temp = sqliteTable('temp', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
