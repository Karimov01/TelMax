import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { requireDatabaseUrl } from "./url";
export function getDb() { return drizzle(neon(requireDatabaseUrl()), { schema }); }
