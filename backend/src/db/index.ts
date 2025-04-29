import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const client = createClient({
  url: 'file:sqlite.db'
});

export const db = drizzle(client, { schema });

// Export the schema for use in other files
export { schema }; 