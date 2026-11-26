import { readFile } from "node:fs/promises";
import { createPool } from "./pool.js";

const pool = createPool();
try {
  const client = await pool.connect();
  try {
    const schema = new URL("../../../src/infrastructure/database/migrations/001_core.sql", import.meta.url);
    await client.query("BEGIN");
    await client.query(await readFile(schema, "utf8"));
    await client.query(`
      INSERT INTO areas (name) VALUES ('Main room'), ('Patio')
      ON CONFLICT (name) DO NOTHING;

      INSERT INTO restaurant_tables (code, seats, area_id)
      SELECT seed.code, seed.seats, areas.id
      FROM (VALUES ('M1', 2, 'Main room'), ('M2', 4, 'Main room'), ('P1', 4, 'Patio'))
        AS seed(code, seats, area_name)
      JOIN areas ON areas.name = seed.area_name
      ON CONFLICT (code) DO NOTHING;

      INSERT INTO service_sessions (code, business_date, state, open_time)
      VALUES ('MVP-INITIAL', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date, 'ACTIVE', CURRENT_TIMESTAMP)
      ON CONFLICT DO NOTHING;
    `);
    await client.query("COMMIT");
    console.log("Database schema and sample seating are ready.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
