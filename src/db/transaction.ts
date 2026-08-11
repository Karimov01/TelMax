import {Pool} from "@neondatabase/serverless";
import {drizzle} from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import {requireDatabaseUrl} from "./url";

/** Neon HTTP is the read path; atomic mutations use this Pool driver. */
function createDb(pool:Pool){return drizzle(pool,{schema})}
type Transaction=Parameters<Parameters<ReturnType<typeof createDb>["transaction"]>[0]>[0];
export async function withTransaction<T>(work:(tx:Transaction)=>Promise<T>){
 const pool=new Pool({connectionString:requireDatabaseUrl()});
 const db=createDb(pool);
 try{return await db.transaction(work)}finally{await pool.end()}
}
