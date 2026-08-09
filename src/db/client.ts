import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
export function getDb() { if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL sozlanmagan"); return drizzle(neon(process.env.DATABASE_URL), { schema }); }
