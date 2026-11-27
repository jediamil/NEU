import { Pool } from 'pg';
const pool = new Pool({
    connectionString: (
        process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
    )?.replace('sslmode=require', 'sslmode=verify-full'),
    max: 1,
});
try {
    const result = await pool.query(
        'SELECT migration FROM public.migrations WHERE migration = $1',
        ['2026_11_24_200744_add_shared_mobile_records'],
    );
    if (!result.rowCount)
        throw new Error(
            'Shared schema is missing. Run php artisan migrate in the Laravel project root.',
        );
    console.log(
        'Shared clinic schema verified. Schema migrations are owned by Laravel; no prototype data was seeded.',
    );
} finally {
    await pool.end();
}
