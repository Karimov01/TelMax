import {and, asc, desc, eq, gt, sql} from "drizzle-orm";
import {auditLogs, inventoryMovements, inventoryUnits, partnerPayments, partnerPhones, partners, products, purchaseBatches} from "@/db/schema";
import {getDb} from "@/db/client";
import {withTransaction} from "@/db/transaction";
import type {Role} from "@/lib/permissions";
import {can} from "@/lib/permissions";

const n=(v:unknown)=>Number(v??0);

export async function getInstallmentDashboard(){
 const db=getDb();
 const partnerRows=await db.select({id:partners.id,name:partners.name,active:partners.active,phones:sql<number>`count(${partnerPhones.id})`,activePhones:sql<number>`count(${partnerPhones.id}) filter (where ${partnerPhones.status}='ACTIVE')`,given:sql<number>`coalesce(sum(${partnerPhones.givenAmount}),0)`,received:sql<number>`coalesce(sum(${partnerPhones.receivedAmount}),0)`,remaining:sql<number>`coalesce(sum(${partnerPhones.remainingAmount}),0)`,overdue:sql<number>`count(${partnerPhones.id}) filter (where ${partnerPhones.status}='ACTIVE' and ${partnerPhones.dueDate} < current_date)`}).from(partners).leftJoin(partnerPhones,eq(partnerPhones.partnerId,partners.id)).groupBy(partners.id).orderBy(desc(partners.active),asc(partners.name));
 const [summary]=await db.select({given:sql<number>`coalesce(sum(${partnerPhones.givenAmount}),0)`,received:sql<number>`coalesce(sum(${partnerPhones.receivedAmount}),0)`,remaining:sql<number>`coalesce(sum(${partnerPhones.remainingAmount}),0)`,active:sql<number>`count(*) filter (where ${partnerPhones.status}='ACTIVE')`,overdueAmount:sql<number>`coalesce(sum(${partnerPhones.remainingAmount}) filter (where ${partnerPhones.status}='ACTIVE' and ${partnerPhones.dueDate}<current_date),0)`}).from(partnerPhones);
 const items=await db.select({id:partnerPhones.id,partnerId:partners.id,partner:partners.name,productId:products.id,brand:products.brand,model:products.model,storage:products.storage,color:products.color,category:products.category,givenAmount:partnerPhones.givenAmount,receivedAmount:partnerPhones.receivedAmount,remainingAmount:partnerPhones.remainingAmount,dueDate:partnerPhones.dueDate,customerName:partnerPhones.customerName,customerPhone:partnerPhones.customerPhone,status:partnerPhones.status,imageUrl:sql<string|null>`(select m.url from media m where m.product_id=${products.id} order by m.sort_order,m.id limit 1)`}).from(partnerPhones).innerJoin(partners,eq(partners.id,partnerPhones.partnerId)).innerJoin(products,eq(products.id,partnerPhones.productId)).orderBy(desc(partnerPhones.id)).limit(100);
 return {summary:{given:n(summary.given),received:n(summary.received),remaining:n(summary.remaining),active:n(summary.active),overdueAmount:n(summary.overdueAmount)},partners:partnerRows.map(x=>({...x,phones:n(x.phones),activePhones:n(x.activePhones),given:n(x.given),received:n(x.received),remaining:n(x.remaining),overdue:n(x.overdue)})),items};
}

export async function getInstallmentDetail(id:number){
 const db=getDb();
 const [item]=await db.select({id:partnerPhones.id,partnerId:partners.id,partner:partners.name,productId:products.id,brand:products.brand,model:products.model,storage:products.storage,color:products.color,category:products.category,givenAmount:partnerPhones.givenAmount,receivedAmount:partnerPhones.receivedAmount,remainingAmount:partnerPhones.remainingAmount,dueDate:partnerPhones.dueDate,customerName:partnerPhones.customerName,customerPhone:partnerPhones.customerPhone,warrantyDays:partnerPhones.warrantyDays,notes:partnerPhones.notes,status:partnerPhones.status,createdAt:partnerPhones.createdAt,imageUrl:sql<string|null>`(select m.url from media m where m.product_id=${products.id} order by m.sort_order,m.id limit 1)`}).from(partnerPhones).innerJoin(partners,eq(partners.id,partnerPhones.partnerId)).innerJoin(products,eq(products.id,partnerPhones.productId)).where(eq(partnerPhones.id,id)).limit(1);
 if(!item)return null;
 const payments=await db.select({id:partnerPayments.id,amount:partnerPayments.amount,cashAmount:partnerPayments.cashAmount,cardAmount:partnerPayments.cardAmount,notes:partnerPayments.notes,paidAt:partnerPayments.paidAt,status:partnerPayments.status}).from(partnerPayments).where(eq(partnerPayments.partnerPhoneId,id)).orderBy(desc(partnerPayments.paidAt));
 return {...item,payments};
}

export async function addPartner(input:{name:string;actor:{id:number;role:Role}}){
 if(!can(input.actor.role,"inventory:write"))throw new Error("Bu amal uchun ruxsat yo‘q");
 const name=input.name.trim();if(name.length<2)throw new Error("Hamkor nomini kiriting");
 const db=getDb();
 const [existing]=await db.select().from(partners).where(eq(partners.name,name)).limit(1);
 if(existing){if(!existing.active)await db.update(partners).set({active:true,updatedAt:new Date()}).where(eq(partners.id,existing.id));return {id:existing.id,name:existing.name};}
 const [created]=await db.insert(partners).values({name,active:true}).returning({id:partners.id,name:partners.name});
 await db.insert(auditLogs).values({actorId:input.actor.id,action:"PARTNER_CREATED",entityType:"PARTNER",entityId:created.id,details:{name}});
 return created;
}

export async function createInstallment(input:{partnerId:number;productId:number;givenAmount:number;initialPayment:number;dueDate?:string;customerName?:string;customerPhone?:string;warrantyDays?:number;notes?:string;actor:{id:number;role:Role}}){
 if(!can(input.actor.role,"inventory:write"))throw new Error("Bu amal uchun ruxsat yo‘q");
 if(input.givenAmount<1||input.initialPayment<0||input.initialPayment>input.givenAmount)throw new Error("Summalarni tekshiring");
 return withTransaction(async tx=>{
  const [partner]=await tx.select().from(partners).where(and(eq(partners.id,input.partnerId),eq(partners.active,true))).limit(1);if(!partner)throw new Error("Hamkor topilmadi");
  const [product]=await tx.select().from(products).where(eq(products.id,input.productId)).limit(1);if(!product)throw new Error("Telefon topilmadi");
  const [batch]=await tx.select().from(purchaseBatches).where(and(eq(purchaseBatches.productId,input.productId),gt(purchaseBatches.availableQuantity,0))).orderBy(asc(purchaseBatches.receivedAt)).for("update").limit(1);if(!batch)throw new Error("Omborda bu telefon qolmagan");
  let unitId:number|null=null;
  if(product.category==="SMARTPHONE"){
   const [unit]=await tx.select().from(inventoryUnits).where(and(eq(inventoryUnits.productId,input.productId),eq(inventoryUnits.batchId,batch.id),eq(inventoryUnits.status,"AVAILABLE"))).for("update").limit(1);if(!unit)throw new Error("Sensorli telefon omborda mavjud emas");unitId=unit.id;
   await tx.update(inventoryUnits).set({status:"RESERVED",updatedAt:new Date()}).where(and(eq(inventoryUnits.id,unit.id),eq(inventoryUnits.status,"AVAILABLE")));
  }
  const changed=await tx.update(purchaseBatches).set({availableQuantity:sql`${purchaseBatches.availableQuantity}-1`,updatedAt:new Date()}).where(and(eq(purchaseBatches.id,batch.id),sql`${purchaseBatches.availableQuantity}>0`)).returning({id:purchaseBatches.id});if(!changed.length)throw new Error("Ombor qoldig‘i o‘zgardi, qayta urinib ko‘ring");
  const remaining=input.givenAmount-input.initialPayment;
  const [row]=await tx.insert(partnerPhones).values({partnerId:input.partnerId,productId:input.productId,givenAmount:input.givenAmount,receivedAmount:input.initialPayment,remainingAmount:remaining,dueDate:input.dueDate||null,customerName:input.customerName?.trim()||null,customerPhone:input.customerPhone?.trim()||null,warrantyDays:input.warrantyDays??0,notes:input.notes?.trim()||null,status:remaining===0?"PAID":"ACTIVE"}).returning({id:partnerPhones.id});
  if(input.initialPayment>0)await tx.insert(partnerPayments).values({partnerId:input.partnerId,partnerPhoneId:row.id,amount:input.initialPayment,cashAmount:input.initialPayment,notes:"Boshlang‘ich to‘lov"});
  await tx.insert(inventoryMovements).values({productId:input.productId,batchId:batch.id,type:"PARTNER_INSTALLMENT",quantity:-1,referenceType:"PARTNER_PHONE",referenceId:row.id,actorId:input.actor.id,details:{partnerId:input.partnerId,partner:partner.name,unitId}});
  await tx.insert(auditLogs).values({actorId:input.actor.id,action:"PARTNER_PHONE_CREATED",entityType:"PARTNER_PHONE",entityId:row.id,details:{partnerId:input.partnerId,productId:input.productId,givenAmount:input.givenAmount,initialPayment:input.initialPayment,remaining,dueDate:input.dueDate||null,unitId}});
  return {id:row.id,remaining};
 });
}

export async function addInstallmentPayment(input:{id:number;amount:number;method:"CASH"|"CARD"|"TRANSFER"|"OTHER";notes?:string;actor:{id:number;role:Role}}){
 if(!can(input.actor.role,"inventory:write"))throw new Error("Bu amal uchun ruxsat yo‘q");
 if(input.amount<1)throw new Error("To‘lov summasini kiriting");
 return withTransaction(async tx=>{
  const [item]=await tx.select().from(partnerPhones).where(eq(partnerPhones.id,input.id)).for("update").limit(1);if(!item)throw new Error("Bo‘lib to‘lash topilmadi");if(item.status!=="ACTIVE")throw new Error("Bu bo‘lib to‘lash yopilgan");if(input.amount>item.remainingAmount)throw new Error("To‘lov qoldiq summadan katta bo‘lishi mumkin emas");
  const remaining=item.remainingAmount-input.amount,received=item.receivedAmount+input.amount;
  await tx.insert(partnerPayments).values({partnerId:item.partnerId,partnerPhoneId:item.id,amount:input.amount,cashAmount:input.method==="CASH"?input.amount:0,cardAmount:input.method==="CARD"?input.amount:0,notes:[input.method,input.notes?.trim()].filter(Boolean).join(" — ")||null});
  await tx.update(partnerPhones).set({receivedAmount:received,remainingAmount:remaining,status:remaining===0?"PAID":"ACTIVE",updatedAt:new Date()}).where(eq(partnerPhones.id,item.id));
  await tx.insert(auditLogs).values({actorId:input.actor.id,action:"PARTNER_PAYMENT",entityType:"PARTNER_PHONE",entityId:item.id,details:{amount:input.amount,method:input.method,remaining}});
  return {remaining,received,status:remaining===0?"PAID":"ACTIVE"};
 });
}
