import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import { auditLogs, customers, inventoryMovements, inventoryUnits, products, purchaseBatches, saleItems, sales } from "@/db/schema";
import type { Role } from "@/lib/permissions";
import { can } from "@/lib/permissions";
import { requireDatabaseUrl } from "@/db/url";

function transactionalDb(){const pool=new Pool({connectionString:requireDatabaseUrl()});return {pool,db:drizzle(pool)};}
export type SaleInput={productId:number;quantity:number;unitSalePrice:number;customerName?:string;customerPhone?:string;notes?:string;idempotencyKey:string;paymentMethod:"CASH"|"CARD"|"MIXED"|"TRANSFER"|"OTHER";actor:{id:number;role:Role}};

export async function sellProduct(input:SaleInput){
 if(!can(input.actor.role,"sale:create"))throw new Error("Bu amal uchun ruxsat yo‘q");
 if(input.quantity<1||input.unitSalePrice<1)throw new Error("Sotuv ma’lumotlari noto‘g‘ri");
 const {pool,db}=transactionalDb();
 try{return await db.transaction(async tx=>{
  const [existing]=await tx.select({id:sales.id,subtotal:sales.subtotal,grossProfit:sales.grossProfit}).from(sales).where(eq(sales.idempotencyKey,input.idempotencyKey)).limit(1);
  if(existing)return {saleId:existing.id,remainingStock:-1,revenue:existing.subtotal,grossProfit:existing.grossProfit,replayed:true};
  const [product]=await tx.select().from(products).where(eq(products.id,input.productId)).limit(1);
  if(!product)throw new Error("Telefon topilmadi");
  const batches=await tx.select().from(purchaseBatches).where(and(eq(purchaseBatches.productId,input.productId),gt(purchaseBatches.availableQuantity,0))).orderBy(asc(purchaseBatches.receivedAt)).for("update");
  const stock=batches.reduce((n,b)=>n+b.availableQuantity,0);
  if(stock<input.quantity)throw new Error("Omborda yetarli telefon mavjud emas");
  const customerName=input.customerName?.trim()||null,customerPhone=input.customerPhone?.trim()||null;
  let customerId:number|null=null;
  if(customerPhone){
   const [found]=await tx.select().from(customers).where(eq(customers.phone,customerPhone)).limit(1);
   if(found){customerId=found.id;if(customerName&&customerName!==found.name)await tx.update(customers).set({name:customerName,updatedAt:new Date()}).where(eq(customers.id,found.id));}
   else if(customerName){const [created]=await tx.insert(customers).values({name:customerName,phone:customerPhone}).returning();customerId=created.id;}
  }
  const subtotal=input.unitSalePrice*input.quantity;
  let remaining=input.quantity,totalCost=0;
  const allocations:{batchId:number;quantity:number;unitCost:number}[]=[];
  for(const batch of batches){
   if(!remaining)break;
   const take=Math.min(remaining,batch.availableQuantity),unitCost=batch.unitCost+batch.extraUnitCost;
   allocations.push({batchId:batch.id,quantity:take,unitCost});totalCost+=take*unitCost;remaining-=take;
   await tx.update(purchaseBatches).set({availableQuantity:sql`${purchaseBatches.availableQuantity}-${take}`,updatedAt:new Date()}).where(and(eq(purchaseBatches.id,batch.id),sql`${purchaseBatches.availableQuantity} >= ${take}`));
  }
  const [sale]=await tx.insert(sales).values({number:`TM-${Date.now()}`,idempotencyKey:input.idempotencyKey,customerId,customerName,customerPhone,soldBy:input.actor.id,subtotal,paidAmount:subtotal,cashAmount:input.paymentMethod==="CASH"?subtotal:0,cardAmount:input.paymentMethod==="CARD"?subtotal:0,debtAmount:0,grossProfit:subtotal-totalCost,paymentMethod:input.paymentMethod,notes:input.notes?.trim()||null}).returning();
  for(const a of allocations){
   const units=product.category==="SMARTPHONE"?await tx.select().from(inventoryUnits).where(and(eq(inventoryUnits.productId,input.productId),eq(inventoryUnits.batchId,a.batchId),eq(inventoryUnits.status,"AVAILABLE"))).for("update").limit(a.quantity):[];
   if(product.category==="SMARTPHONE"&&units.length<a.quantity)throw new Error("Sensorli telefonlar omborda yetarli emas");
   if(units.length)await Promise.all(units.map(unit=>tx.update(inventoryUnits).set({status:"SOLD",updatedAt:new Date()}).where(and(eq(inventoryUnits.id,unit.id),eq(inventoryUnits.status,"AVAILABLE")))));
   if(product.category==="SMARTPHONE")for(const unit of units)await tx.insert(saleItems).values({saleId:sale.id,productId:input.productId,inventoryUnitId:unit.id,batchId:a.batchId,quantity:1,unitSalePrice:input.unitSalePrice,unitCostSnapshot:a.unitCost,profitSnapshot:input.unitSalePrice-a.unitCost});
   else await tx.insert(saleItems).values({saleId:sale.id,productId:input.productId,batchId:a.batchId,quantity:a.quantity,unitSalePrice:input.unitSalePrice,unitCostSnapshot:a.unitCost,profitSnapshot:(input.unitSalePrice-a.unitCost)*a.quantity});
   await tx.insert(inventoryMovements).values({productId:input.productId,batchId:a.batchId,type:"SALE",quantity:-a.quantity,referenceType:"SALE",referenceId:sale.id,actorId:input.actor.id});
  }
  await tx.insert(auditLogs).values({actorId:input.actor.id,action:"PHONE_SOLD",entityType:"SALE",entityId:sale.id,details:{productId:input.productId,quantity:input.quantity,subtotal,paymentMethod:input.paymentMethod,customerName,customerPhone}});
  return {saleId:sale.id,remainingStock:stock-input.quantity,revenue:subtotal,grossProfit:subtotal-totalCost,replayed:false};
 });}finally{await pool.end();}
}
