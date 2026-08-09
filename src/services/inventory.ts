import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import { auditLogs, customers, inventoryMovements, inventoryUnits, products, purchaseBatches, saleItems, sales } from "@/db/schema";
import type { Role } from "@/lib/permissions";
import { can } from "@/lib/permissions";
import { requireDatabaseUrl } from "@/db/url";

function transactionalDb(){ const pool=new Pool({connectionString:requireDatabaseUrl()}); return {pool,db:drizzle(pool)}; }
export type SaleInput={productId:number;quantity:number;unitSalePrice:number;paidAmount:number;customerName:string;customerPhone:string;paymentMethod:"CASH"|"CARD"|"MIXED";actor:{id:number;role:Role}};

export async function sellProduct(input:SaleInput){
 if(!can(input.actor.role,"sale:create"))throw new Error("Bu amal uchun ruxsat yo‘q"); if(input.quantity<1||input.unitSalePrice<1||input.paidAmount<0)throw new Error("Sotuv ma’lumotlari noto‘g‘ri");
 const {pool,db}=transactionalDb(); try{return await db.transaction(async tx=>{
  const [product]=await tx.select().from(products).where(eq(products.id,input.productId)).limit(1); if(!product)throw new Error("Telefon topilmadi"); if(product.category==="SMARTPHONE"&&input.quantity!==1)throw new Error("Sensorli telefon bittadan sotiladi");
  const batches=await tx.select().from(purchaseBatches).where(and(eq(purchaseBatches.productId,input.productId),gt(purchaseBatches.availableQuantity,0))).orderBy(asc(purchaseBatches.receivedAt)).for("update");
  if(batches.reduce((n,b)=>n+b.availableQuantity,0)<input.quantity)throw new Error("Omborda yetarli telefon mavjud emas");
  const [customer]=await tx.insert(customers).values({name:input.customerName,phone:input.customerPhone}).onConflictDoUpdate({target:customers.phone,set:{name:input.customerName,updatedAt:new Date()}}).returning();
  const subtotal=input.unitSalePrice*input.quantity; let remaining=input.quantity; let totalCost=0; const allocations:{batchId:number;quantity:number;unitCost:number}[]=[];
  for(const batch of batches){if(!remaining)break;const take=Math.min(remaining,batch.availableQuantity);const unitCost=batch.unitCost+batch.extraUnitCost;allocations.push({batchId:batch.id,quantity:take,unitCost});totalCost+=take*unitCost;remaining-=take;await tx.update(purchaseBatches).set({availableQuantity:sql`${purchaseBatches.availableQuantity}-${take}`,updatedAt:new Date()}).where(and(eq(purchaseBatches.id,batch.id),sql`${purchaseBatches.availableQuantity} >= ${take}`));}
  const [sale]=await tx.insert(sales).values({number:`TM-${Date.now()}`,customerId:customer.id,soldBy:input.actor.id,subtotal,paidAmount:Math.min(input.paidAmount,subtotal),debtAmount:Math.max(0,subtotal-input.paidAmount),grossProfit:subtotal-totalCost,paymentMethod:input.paymentMethod}).returning();
  for(const a of allocations){let inventoryUnitId:number|undefined;if(product.category==="SMARTPHONE"){const [unit]=await tx.select().from(inventoryUnits).where(and(eq(inventoryUnits.productId,input.productId),eq(inventoryUnits.batchId,a.batchId),eq(inventoryUnits.status,"AVAILABLE"))).for("update").limit(1);if(!unit)throw new Error("Sensorli telefon omborda topilmadi");inventoryUnitId=unit.id;await tx.update(inventoryUnits).set({status:"SOLD",updatedAt:new Date()}).where(and(eq(inventoryUnits.id,unit.id),eq(inventoryUnits.status,"AVAILABLE")));}await tx.insert(saleItems).values({saleId:sale.id,productId:input.productId,inventoryUnitId,batchId:a.batchId,quantity:a.quantity,unitSalePrice:input.unitSalePrice,unitCostSnapshot:a.unitCost,profitSnapshot:(input.unitSalePrice-a.unitCost)*a.quantity});await tx.insert(inventoryMovements).values({productId:input.productId,batchId:a.batchId,type:"SALE",quantity:-a.quantity,referenceType:"SALE",referenceId:sale.id,actorId:input.actor.id});}
  await tx.insert(auditLogs).values({actorId:input.actor.id,action:"PHONE_SOLD",entityType:"SALE",entityId:sale.id,details:{productId:input.productId,quantity:input.quantity,subtotal}}); return {saleId:sale.id,remainingStock:batches.reduce((n,b)=>n+b.availableQuantity,0)-input.quantity,revenue:subtotal,grossProfit:subtotal-totalCost};
 });}finally{await pool.end();}
}
