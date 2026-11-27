import { Pool } from 'pg';
import { attachDatabasePool } from '@neon/functions';

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL?.replace(
        'sslmode=require',
        'sslmode=verify-full',
    ),
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 20000,
});
attachDatabasePool(pool);
