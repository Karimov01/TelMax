import {and, desc, eq, gte, lte, sql} from "drizzle-orm";
import {getDb} from "@/db/client";
import {media, products, saleItems, sales, users} from "@/db/schema";
import {BUSINESS_TIME_ZONE} from "@/lib/constants";

export type ReportFilters={from:Date;to:Date;category?:"SMARTPHONE"|"FEATURE_PHONE";condition?:string;payment?:"CASH"|"CARD"|"MIXED"|"TRANSFER"|"OTHER";brand?:string};
const activeWhere=(f:ReportFilters)=>and(eq(sales.status,"ACTIVE"),gte(sales.soldAt,f.from),lte(sales.soldAt,f.to),f.payment?eq(sales.paymentMethod,f.payment):undefined);
const itemWhere=(f:ReportFilters)=>and(activeWhere(f),f.category?eq(products.category,f.category):undefined,f.condition?eq(products.condition,f.condition):undefined,f.brand?eq(products.brand,f.brand):undefined);
const n=(value:unknown)=>Number(value??0);

export async function reportSummary(f:ReportFilters){
 const db=getDb();
 const [summary]=await db.select({revenue:sql<number>`coalesce(sum(${sales.subtotal}),0)`,profit:sql<number>`coalesce(sum(${sales.grossProfit}),0)`,count:sql<number>`count(${sales.id})`}).from(sales).where(activeWhere(f));
 const span=Math.max(1,f.to.getTime()-f.from.getTime()+1),previousTo=new Date(f.from.getTime()-1),previousFrom=new Date(previousTo.getTime()-span+1);
 const [previous]=await db.select({revenue:sql<number>`coalesce(sum(${sales.subtotal}),0)`,profit:sql<number>`coalesce(sum(${sales.grossProfit}),0)`,count:sql<number>`count(${sales.id})`}).from(sales).where(activeWhere({...f,from:previousFrom,to:previousTo}));
 const durationDays=Math.max(1,Math.ceil(span/86400000));
 const bucket=durationDays<=1?"hour":durationDays>45?"week":"day";
 const bucketSql=bucket==="hour"?sql`date_trunc('hour', ${sales.soldAt} at time zone ${BUSINESS_TIME_ZONE})`:bucket==="week"?sql`date_trunc('week', ${sales.soldAt} at time zone ${BUSINESS_TIME_ZONE})`:sql`date_trunc('day', ${sales.soldAt} at time zone ${BUSINESS_TIME_ZONE})`;
 const trend=await db.select({bucket:bucketSql,revenue:sql<number>`coalesce(sum(${sales.subtotal}),0)`,profit:sql<number>`coalesce(sum(${sales.grossProfit}),0)`}).from(sales).where(activeWhere(f)).groupBy(bucketSql).orderBy(bucketSql);
 const top=await db.select({productId:products.id,brand:products.brand,model:products.model,storage:products.storage,color:products.color,platform:products.platform,quantity:sql<number>`coalesce(sum(${saleItems.quantity}),0)`,revenue:sql<number>`coalesce(sum(${saleItems.quantity}*${saleItems.unitSalePrice}),0)`,imageUrl:sql<string|null>`(select m.url from media m where m.product_id=${products.id} order by m.sort_order,m.id limit 1)`}).from(saleItems).innerJoin(sales,eq(sales.id,saleItems.saleId)).innerJoin(products,eq(products.id,saleItems.productId)).where(itemWhere(f)).groupBy(products.id).orderBy(desc(sql`sum(${saleItems.quantity})`),desc(sql`sum(${saleItems.quantity}*${saleItems.unitSalePrice})`)).limit(5);
 const revenue=n(summary.revenue),count=n(summary.count),profit=n(summary.profit);
 return {kpi:{revenue,profit,count,average:count?Math.round(revenue/count):0},previous:{revenue:n(previous.revenue),profit:n(previous.profit),count:n(previous.count)},trend:trend.map(x=>({bucket:String(x.bucket),revenue:n(x.revenue),profit:n(x.profit)})),top:top.map(x=>({...x,quantity:n(x.quantity),revenue:n(x.revenue)}))};
}

export async function reportBrands(f:ReportFilters){
 const db=getDb();
 const rows=await db.select({brand:products.brand,quantity:sql<number>`coalesce(sum(${saleItems.quantity}),0)`,revenue:sql<number>`coalesce(sum(${saleItems.quantity}*${saleItems.unitSalePrice}),0)`}).from(saleItems).innerJoin(sales,eq(sales.id,saleItems.saleId)).innerJoin(products,eq(products.id,saleItems.productId)).where(itemWhere(f)).groupBy(products.brand).orderBy(desc(sql`sum(${saleItems.quantity})`));
 const total=rows.reduce((s,x)=>s+n(x.quantity),0);return {total,items:rows.map(x=>({brand:x.brand||"Boshqa",quantity:n(x.quantity),revenue:n(x.revenue),percent:total?n(x.quantity)*100/total:0}))};
}

export async function reportConditions(f:ReportFilters){
 const db=getDb();
 const rows=await db.select({condition:products.condition,quantity:sql<number>`coalesce(sum(${saleItems.quantity}),0)`,revenue:sql<number>`coalesce(sum(${saleItems.quantity}*${saleItems.unitSalePrice}),0)`,profit:sql<number>`coalesce(sum(${saleItems.profitSnapshot}),0)`}).from(saleItems).innerJoin(sales,eq(sales.id,saleItems.saleId)).innerJoin(products,eq(products.id,saleItems.productId)).where(itemWhere(f)).groupBy(products.condition).orderBy(desc(sql`sum(${saleItems.quantity})`));
 const total=rows.reduce((s,x)=>s+n(x.quantity),0),revenue=rows.reduce((s,x)=>s+n(x.revenue),0),profit=rows.reduce((s,x)=>s+n(x.profit),0);return {total,revenue,profit,margin:revenue?profit*100/revenue:0,items:rows.map(x=>({condition:x.condition||"Noma’lum",quantity:n(x.quantity),revenue:n(x.revenue),profit:n(x.profit),percent:total?n(x.quantity)*100/total:0}))};
}

export async function reportHistory(f:ReportFilters){
 const db=getDb();
 const rows=await db.select({id:sales.id,number:sales.number,soldAt:sales.soldAt,status:sales.status,paymentMethod:sales.paymentMethod,customerName:sales.customerName,customerPhone:sales.customerPhone,notes:sales.notes,seller:users.firstName,subtotal:sales.subtotal,grossProfit:sales.grossProfit,brand:products.brand,model:products.model,category:products.category,platform:products.platform,storage:products.storage,ram:products.ram,color:products.color,condition:products.condition,quantity:saleItems.quantity,unitSalePrice:saleItems.unitSalePrice,unitCost:saleItems.unitCostSnapshot,profitSnapshot:saleItems.profitSnapshot,imageUrl:sql<string|null>`(select m.url from media m where m.product_id=${products.id} order by m.sort_order,m.id limit 1)`}).from(sales).innerJoin(saleItems,eq(saleItems.saleId,sales.id)).innerJoin(products,eq(products.id,saleItems.productId)).leftJoin(users,eq(users.id,sales.soldBy)).where(itemWhere(f)).orderBy(desc(sales.soldAt)).limit(250);
 return rows.map(x=>({...x,subtotal:n(x.subtotal),grossProfit:n(x.grossProfit),quantity:n(x.quantity),unitSalePrice:n(x.unitSalePrice),unitCost:n(x.unitCost),profitSnapshot:n(x.profitSnapshot)}));
}

export async function reportSaleDetail(id:number){
 const db=getDb();
 const rows=await db.select({id:sales.id,number:sales.number,soldAt:sales.soldAt,status:sales.status,paymentMethod:sales.paymentMethod,customerName:sales.customerName,customerPhone:sales.customerPhone,notes:sales.notes,seller:users.firstName,subtotal:sales.subtotal,grossProfit:sales.grossProfit,brand:products.brand,model:products.model,category:products.category,platform:products.platform,storage:products.storage,ram:products.ram,color:products.color,condition:products.condition,quantity:saleItems.quantity,unitSalePrice:saleItems.unitSalePrice,unitCost:saleItems.unitCostSnapshot,profitSnapshot:saleItems.profitSnapshot,imageUrl:sql<string|null>`(select m.url from media m where m.product_id=${products.id} order by m.sort_order,m.id limit 1)`}).from(sales).innerJoin(saleItems,eq(saleItems.saleId,sales.id)).innerJoin(products,eq(products.id,saleItems.productId)).leftJoin(users,eq(users.id,sales.soldBy)).where(eq(sales.id,id));
 if(!rows.length)return null;const first=rows[0];return {...first,subtotal:n(first.subtotal),grossProfit:n(first.grossProfit),items:rows.map(x=>({brand:x.brand,model:x.model,category:x.category,platform:x.platform,storage:x.storage,ram:x.ram,color:x.color,condition:x.condition,quantity:n(x.quantity),unitSalePrice:n(x.unitSalePrice),unitCost:n(x.unitCost),profitSnapshot:n(x.profitSnapshot),imageUrl:x.imageUrl}))};
}

export async function reportFacets(){const db=getDb();const brands=await db.selectDistinct({brand:products.brand}).from(products).orderBy(products.brand);return {brands:brands.map(x=>x.brand).filter(Boolean)};}
