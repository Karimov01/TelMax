import {and, desc, eq, gte, lt, sql} from "drizzle-orm";
import {getDb} from "@/db/client";
import {databaseUrl} from "@/db/url";
import {media,products,purchaseBatches,saleItems,sales} from "@/db/schema";
import {businessDate} from "./business-date";

export const LOW_STOCK_THRESHOLD=Math.max(1,Number(process.env.LOW_STOCK_THRESHOLD||2));
type Summary={salesCount:number;revenue:number;profit:number};
type Phone={id:number;brand:string;model:string;category:"SMARTPHONE"|"FEATURE_PHONE";platform:string|null;storage:string|null;ram:string|null;color:string|null;salePrice:number;quantity:number;imageUrl:string|null};
export type DashboardData={today:Summary;yesterday:Summary;totalProfit:number;lowStock:Phone[];recent:{id:number;soldAt:Date;brand:string;model:string;category:"SMARTPHONE"|"FEATURE_PHONE";storage:string|null;color:string|null;quantity:number;total:number;profit:number;imageUrl:string|null}[]};
const zero:Summary={salesCount:0,revenue:0,profit:0};

export async function getDashboardData():Promise<DashboardData>{
 if(!databaseUrl())return {today:zero,yesterday:zero,totalProfit:0,lowStock:[],recent:[]};
 const db=getDb(),todayStart=new Date(`${businessDate()}T00:00:00+05:00`),yesterdayStart=new Date(todayStart.getTime()-86400000);
 const summary=(from:Date,to?:Date)=>db.select({salesCount:sql<number>`count(*)`,revenue:sql<number>`coalesce(sum(${sales.subtotal}),0)`,profit:sql<number>`coalesce(sum(${sales.grossProfit}),0)`}).from(sales).where(and(eq(sales.status,"ACTIVE"),gte(sales.soldAt,from),to?lt(sales.soldAt,to):undefined));
 const stock=sql<number>`coalesce(sum(${purchaseBatches.availableQuantity}),0)`;
 const image=sql<string|null>`(select ${media.url} from ${media} where ${media.productId}=${products.id} order by ${media.sortOrder} asc limit 1)`;
 const [todayRows,yesterdayRows,totalRows,lowStock,recent]=await Promise.all([
  summary(todayStart),summary(yesterdayStart,todayStart),
  db.select({profit:sql<number>`coalesce(sum(${sales.grossProfit}),0)`}).from(sales).where(eq(sales.status,"ACTIVE")),
  db.select({id:products.id,brand:products.brand,model:products.model,category:products.category,platform:products.platform,storage:products.storage,ram:products.ram,color:products.color,salePrice:products.salePrice,quantity:stock,imageUrl:image}).from(products).innerJoin(purchaseBatches,eq(purchaseBatches.productId,products.id)).groupBy(products.id).having(and(sql`${stock}>0`,sql`${stock}<=${LOW_STOCK_THRESHOLD}`)).orderBy(stock).limit(3),
  db.select({id:sales.id,soldAt:sales.soldAt,brand:products.brand,model:products.model,category:products.category,storage:products.storage,color:products.color,quantity:sql<number>`sum(${saleItems.quantity})`,total:sales.subtotal,profit:sales.grossProfit,imageUrl:image}).from(sales).innerJoin(saleItems,eq(saleItems.saleId,sales.id)).innerJoin(products,eq(products.id,saleItems.productId)).where(eq(sales.status,"ACTIVE")).groupBy(sales.id,products.id).orderBy(desc(sales.soldAt)).limit(3)
 ]);
 const map=(x:{salesCount:number;revenue:number;profit:number}|undefined):Summary=>({salesCount:Number(x?.salesCount||0),revenue:Number(x?.revenue||0),profit:Number(x?.profit||0)});
 return {today:map(todayRows[0]),yesterday:map(yesterdayRows[0]),totalProfit:Number(totalRows[0]?.profit||0),lowStock:lowStock.map(x=>({...x,salePrice:Number(x.salePrice),quantity:Number(x.quantity)})),recent:recent.map(x=>({...x,quantity:Number(x.quantity),total:Number(x.total),profit:Number(x.profit)}))};
}
