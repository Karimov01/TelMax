import {and,desc,eq,gte,ilike,lte,or,sql} from "drizzle-orm";
import {auditLogs,debtPayments,debts,media,products,saleItems,sales,users} from "@/db/schema";
import {getDb} from "@/db/client";
import {withTransaction} from "@/db/transaction";
import {BUSINESS_TIME_ZONE} from "@/lib/constants";
import type {Role} from "@/lib/permissions";
import {can} from "@/lib/permissions";

export type DebtFilter="all"|"active"|"overdue"|"soon"|"paid";
const n=(v:unknown)=>Number(v??0);
function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:BUSINESS_TIME_ZONE,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function plusDays(date:string,days:number){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}

export async function listDebts(input:{q?:string;filter?:DebtFilter}){
 const db=getDb(),now=today(),soon=plusDays(now,3),q=input.q?.trim(),filter=input.filter??"all";
 const statusWhere=filter==="paid"?eq(debts.status,"PAID"):filter==="active"?eq(debts.status,"ACTIVE"):filter==="overdue"?and(eq(debts.status,"ACTIVE"),sql`${debts.dueDate}<${now}`):filter==="soon"?and(eq(debts.status,"ACTIVE"),gte(debts.dueDate,now),lte(debts.dueDate,soon)):undefined;
 const searchWhere=q?or(ilike(sales.customerName,`%${q}%`),ilike(sales.customerPhone,`%${q}%`),sql`exists(select 1 from sale_items si join products p on p.id=si.product_id where si.sale_id=${sales.id} and (p.brand ilike ${`%${q}%`} or p.model ilike ${`%${q}%`}))`):undefined;
 const rows=await db.select({
  id:debts.id,saleId:debts.saleId,totalAmount:debts.totalAmount,paidAmount:debts.paidAmount,remainingAmount:debts.remainingAmount,dueDate:debts.dueDate,status:debts.status,
  customerName:sales.customerName,customerPhone:sales.customerPhone,saleNumber:sales.number,soldAt:sales.soldAt,
  brand:sql<string|null>`(select p.brand from sale_items si join products p on p.id=si.product_id where si.sale_id=${sales.id} order by si.id limit 1)`,
  model:sql<string|null>`(select p.model from sale_items si join products p on p.id=si.product_id where si.sale_id=${sales.id} order by si.id limit 1)`,
  storage:sql<string|null>`(select p.storage from sale_items si join products p on p.id=si.product_id where si.sale_id=${sales.id} order by si.id limit 1)`,
  color:sql<string|null>`(select p.color from sale_items si join products p on p.id=si.product_id where si.sale_id=${sales.id} order by si.id limit 1)`,
  imageUrl:sql<string|null>`(select m.url from sale_items si join media m on m.product_id=si.product_id where si.sale_id=${sales.id} order by si.id,m.sort_order,m.id limit 1)`
 }).from(debts).innerJoin(sales,eq(sales.id,debts.saleId)).where(and(statusWhere,searchWhere)).orderBy(sql`case when ${debts.status}='ACTIVE' and ${debts.dueDate}<${now} then 0 when ${debts.status}='ACTIVE' then 1 else 2 end`,debts.dueDate,desc(debts.id)).limit(200);
 const [sum]=await db.select({total:sql<number>`coalesce(sum(${debts.remainingAmount}),0)`,active:sql<number>`count(*) filter(where ${debts.status}='ACTIVE')`,overdue:sql<number>`count(*) filter(where ${debts.status}='ACTIVE' and ${debts.dueDate}<${now})`,dueToday:sql<number>`coalesce(sum(${debts.remainingAmount}) filter(where ${debts.status}='ACTIVE' and ${debts.dueDate}=${now}),0)`}).from(debts);
 return {today:now,summary:{total:n(sum.total),active:n(sum.active),overdue:n(sum.overdue),dueToday:n(sum.dueToday)},rows:rows.map(r=>({...r,totalAmount:n(r.totalAmount),paidAmount:n(r.paidAmount),remainingAmount:n(r.remainingAmount)}))};
}

export async function getDebtDetail(id:number){
 const db=getDb();
 const [row]=await db.select({id:debts.id,saleId:debts.saleId,totalAmount:debts.totalAmount,paidAmount:debts.paidAmount,remainingAmount:debts.remainingAmount,dueDate:debts.dueDate,status:debts.status,customerName:sales.customerName,customerPhone:sales.customerPhone,saleNumber:sales.number,soldAt:sales.soldAt,notes:sales.notes,seller:users.firstName,subtotal:sales.subtotal,brand:products.brand,model:products.model,storage:products.storage,color:products.color,category:products.category,platform:products.platform,imageUrl:sql<string|null>`(select m.url from media m where m.product_id=${products.id} order by m.sort_order,m.id limit 1)`}).from(debts).innerJoin(sales,eq(sales.id,debts.saleId)).innerJoin(saleItems,eq(saleItems.saleId,sales.id)).innerJoin(products,eq(products.id,saleItems.productId)).leftJoin(users,eq(users.id,sales.soldBy)).where(eq(debts.id,id)).limit(1);
 if(!row)return null;
 const payments=await db.select({id:debtPayments.id,amount:debtPayments.amount,cashAmount:debtPayments.cashAmount,cardAmount:debtPayments.cardAmount,notes:debtPayments.notes,paidAt:debtPayments.paidAt,status:debtPayments.status,receiver:users.firstName}).from(debtPayments).leftJoin(users,eq(users.id,debtPayments.receivedBy)).where(eq(debtPayments.debtId,id)).orderBy(desc(debtPayments.paidAt));
 return {...row,totalAmount:n(row.totalAmount),paidAmount:n(row.paidAmount),remainingAmount:n(row.remainingAmount),subtotal:n(row.subtotal),payments:payments.map(p=>({...p,amount:n(p.amount),cashAmount:n(p.cashAmount),cardAmount:n(p.cardAmount)}))};
}

export async function receiveDebtPayment(input:{debtId:number;amount:number;method:"CASH"|"CARD"|"TRANSFER"|"OTHER";notes?:string;actor:{id:number;role:Role}}){
 if(!can(input.actor.role,"sale:create"))throw new Error("Bu amal uchun ruxsat yo‘q");
 if(!Number.isInteger(input.amount)||input.amount<1)throw new Error("To‘lov summasini tekshiring");
 return withTransaction(async tx=>{
  const [debt]=await tx.select().from(debts).where(eq(debts.id,input.debtId)).for("update").limit(1);
  if(!debt)throw new Error("Qarz topilmadi");
  if(debt.status!=="ACTIVE")throw new Error("Bu qarz faol emas");
  if(input.amount>debt.remainingAmount)throw new Error("To‘lov qolgan qarzdan katta bo‘lishi mumkin emas");
  const nextRemaining=debt.remainingAmount-input.amount,nextPaid=debt.paidAmount+input.amount,nextStatus=nextRemaining===0?"PAID":"ACTIVE";
  const methodNote=`[${input.method}]${input.notes?.trim()?` ${input.notes.trim()}`:""}`;
  const [payment]=await tx.insert(debtPayments).values({debtId:debt.id,amount:input.amount,cashAmount:input.method==="CASH"?input.amount:0,cardAmount:input.method==="CARD"?input.amount:0,notes:methodNote,receivedBy:input.actor.id}).returning({id:debtPayments.id});
  await tx.update(debts).set({paidAmount:nextPaid,remainingAmount:nextRemaining,status:nextStatus,updatedAt:new Date()}).where(eq(debts.id,debt.id));
  const [sale]=await tx.select().from(sales).where(eq(sales.id,debt.saleId)).for("update").limit(1);
  if(sale)await tx.update(sales).set({paidAmount:sale.paidAmount+input.amount,debtAmount:nextRemaining,cashAmount:sale.cashAmount+(input.method==="CASH"?input.amount:0),cardAmount:sale.cardAmount+(input.method==="CARD"?input.amount:0),updatedAt:new Date()}).where(eq(sales.id,sale.id));
  await tx.insert(auditLogs).values({actorId:input.actor.id,action:"DEBT_PAYMENT_RECEIVED",entityType:"DEBT",entityId:debt.id,details:{paymentId:payment.id,amount:input.amount,method:input.method,remainingAmount:nextRemaining,status:nextStatus}});
  return {paymentId:payment.id,remainingAmount:nextRemaining,status:nextStatus};
 });
}
