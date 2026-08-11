import { and, asc, eq, gt, sql } from "drizzle-orm";
import { auditLogs, customers, debts, inventoryMovements, inventoryUnits, products, purchaseBatches, saleItems, sales } from "@/db/schema";
import type { Role } from "@/lib/permissions";
import { can } from "@/lib/permissions";
import {withTransaction} from "@/db/transaction";

export type SaleInput={productId:number;quantity:number;unitSalePrice:number;customerName?:string;customerPhone?:string;notes?:string;idempotencyKey:string;paymentMethod:"CASH"|"CARD"|"MIXED"|"TRANSFER"|"OTHER";actor:{id:number;role:Role}};
export type CancellationItem={productId:number;batchId:number;inventoryUnitId:number|null;quantity:number;unitCostSnapshot:number;profitSnapshot:number};
export function cancellationTotals(items:CancellationItem[]){return items.reduce((result,item)=>({quantity:result.quantity+item.quantity,cost:result.cost+item.unitCostSnapshot*item.quantity,profit:result.profit+item.profitSnapshot}),{quantity:0,cost:0,profit:0});}
export function assertSaleCancellable(status:string){if(status!=="ACTIVE")throw new Error("Bu savdo allaqachon bekor qilingan");}

export async function sellProduct(input:SaleInput){
 if(!can(input.actor.role,"sale:create"))throw new Error("Bu amal uchun ruxsat yo‘q");
 if(input.quantity<1||input.unitSalePrice<1)throw new Error("Sotuv ma’lumotlari noto‘g‘ri");
 return withTransaction(async tx=>{
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
 });
}

export async function cancelSale(input:{saleId:number;reason?:string;actor:{id:number;role:Role}}){
 if(!can(input.actor.role,"sale:cancel"))throw new Error("Bu amal uchun ruxsat yo‘q");
 return withTransaction(async tx=>{
  const [sale]=await tx.select().from(sales).where(eq(sales.id,input.saleId)).for("update").limit(1);
  if(!sale)throw new Error("Savdo topilmadi");
  assertSaleCancellable(sale.status);
  const items=await tx.select({productId:saleItems.productId,batchId:saleItems.batchId,inventoryUnitId:saleItems.inventoryUnitId,quantity:saleItems.quantity,unitCostSnapshot:saleItems.unitCostSnapshot,profitSnapshot:saleItems.profitSnapshot}).from(saleItems).where(eq(saleItems.saleId,sale.id));
  if(!items.length)throw new Error("Savdo tarkibi topilmadi");
  for(const item of items){
   await tx.update(purchaseBatches).set({availableQuantity:sql`${purchaseBatches.availableQuantity}+${item.quantity}`,updatedAt:new Date()}).where(eq(purchaseBatches.id,item.batchId));
   if(item.inventoryUnitId)await tx.update(inventoryUnits).set({status:"AVAILABLE",updatedAt:new Date()}).where(and(eq(inventoryUnits.id,item.inventoryUnitId),eq(inventoryUnits.status,"SOLD")));
   await tx.insert(inventoryMovements).values({productId:item.productId,batchId:item.batchId,type:"SALE_CANCELLED",quantity:item.quantity,referenceType:"SALE",referenceId:sale.id,actorId:input.actor.id,details:{reason:input.reason?.trim()||null}});
  }
  const [cancelled]=await tx.update(sales).set({status:"CANCELLED",updatedAt:new Date(),notes:[sale.notes,input.reason?.trim()?`Bekor qilish sababi: ${input.reason.trim()}`:null].filter(Boolean).join("\n")||null}).where(and(eq(sales.id,sale.id),eq(sales.status,"ACTIVE"))).returning({id:sales.id});
  if(!cancelled)throw new Error("Bu savdo allaqachon bekor qilingan");
  await tx.update(debts).set({status:"CANCELLED",updatedAt:new Date()}).where(eq(debts.saleId,sale.id));
  const totals=cancellationTotals(items);
  await tx.insert(auditLogs).values({actorId:input.actor.id,action:"SALE_CANCELLED",entityType:"SALE",entityId:sale.id,details:{saleId:sale.id,productIds:[...new Set(items.map(x=>x.productId))],quantityReturned:totals.quantity,revenueRemoved:sale.subtotal,profitRemoved:sale.grossProfit,cancelledBy:input.actor.id,cancelledAt:new Date().toISOString(),reason:input.reason?.trim()||null}});
  return {saleId:sale.id,quantityReturned:totals.quantity,revenueRemoved:sale.subtotal,costRemoved:totals.cost,profitRemoved:sale.grossProfit};
 });
}
