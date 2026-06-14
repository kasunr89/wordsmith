import path from 'node:path';
import fs from 'node:fs';
import Knex from 'knex';
import knexConfig from '../../knexfile';

const env = process.env.NODE_ENV ?? 'development';
const config = knexConfig[env];

const connection = config.connection;
if (connection && typeof connection === 'object' && 'filename' in connection) {
  const filename = connection.filename as string;
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }
}

export const db = Knex(config);

export async function runMigrations(): Promise<void> {
  await db.migrate.latest();
}
