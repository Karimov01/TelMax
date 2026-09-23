import { drizzle } from "drizzle-orm/node-postgres";
import { getPool } from "./client";
import * as schema from "./schema";

function createDb() {
  return drizzle(getPool(), { schema });
}

type Transaction = Parameters<
  Parameters<ReturnType<typeof createDb>["transaction"]>[0]
>[0];

export function withTransaction<T>(work: (tx: Transaction) => Promise<T>) {
  return createDb().transaction(work);
}
