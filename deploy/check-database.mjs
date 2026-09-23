import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const counts = await pool.query(`
    select
      (select count(*)::int from products) as products,
      (select count(*)::int from inventory_units) as inventory_units,
      (select count(*)::int from sales) as sales,
      (select count(*)::int from media) as media
  `);
  const update = await pool.query(`
    select update_id, status, error
    from telegram_updates
    order by update_id desc
    limit 1
  `);

  console.log(
    JSON.stringify({
      ok: true,
      counts: counts.rows[0],
      latestTelegramUpdate: update.rows[0] ?? null,
    }),
  );
} finally {
  await pool.end();
}
