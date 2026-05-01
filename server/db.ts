import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "../shared/schema";
import { logger } from './logger';

const connectionString = process.env.DATABASE_URL!;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const client = postgres(connectionString, {
  onnotice: (notice) => logger.info('Postgres Notice:', notice),
  onparameter: (key, value) => logger.info(`Parameter ${key} = ${value}`),
  debug: (connection, query, params) => {
    logger.debug('Executing query:', query);
    if (params.length) logger.debug('Query params:', params);
  },
});

export const db = drizzle(client, { schema });