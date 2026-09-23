import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { requireDatabaseUrl } from "./url";

declare global {
  var telmaxPostgresPool: Pool | undefined;
}

export function getPool() {
  if (!globalThis.telmaxPostgresPool) {
    globalThis.telmaxPostgresPool = new Pool({
      connectionString: requireDatabaseUrl(),
      max: 10,
    });
  }

  return globalThis.telmaxPostgresPool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}
