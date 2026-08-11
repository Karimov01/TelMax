import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe,expect,it} from "vitest";

const root=process.cwd();
describe("transaction-capable Neon mutations",()=>{
 it("keeps neon-http for reads and Pool for atomic work",()=>{const reads=readFileSync(join(root,"src/db/client.ts"),"utf8"),transactions=readFileSync(join(root,"src/db/transaction.ts"),"utf8");expect(reads).toContain("drizzle-orm/neon-http");expect(transactions).toContain("drizzle-orm/neon-serverless");expect(transactions).toContain("db.transaction(work)")});
 it("never calls transaction on the HTTP inventory client",()=>{const route=readFileSync(join(root,"src/app/api/inventory/route.ts"),"utf8");expect(route).toContain("withTransaction");expect(route).not.toMatch(/getDb\(\)\.transaction|db\.transaction/)});
 it("uses the atomic path for purchase, sale and cancellation",()=>{for(const file of ["src/services/purchases.ts","src/services/inventory.ts"]){expect(readFileSync(join(root,file),"utf8")).toContain("withTransaction")}});
});
