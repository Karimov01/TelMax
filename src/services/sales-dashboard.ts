import {and, desc, eq, gte, sql} from "drizzle-orm";
import {getDb} from "@/db/client";
import {databaseUrl} from "@/db/url";
import {media, products, saleItems, sales} from "@/db/schema";
import {businessDate} from "@/lib/business-date";

export type SalesDashboardData={
 todayCount:number;todayRevenue:number;todayProfit:number;totalProfit:number;
 recent:{id:number;soldAt:Date;brand:string;model:string;category:"SMARTPHONE"|"FEATURE_PHONE";storage:string|null;color:string|null;quantity:number;total:number;profit:number;imageUrl:string|null}[];
};

const empty:SalesDashboardData={todayCount:0,todayRevenue:0,todayProfit:0,totalProfit:0,recent:[]};

export async function getSalesDashboardData():Promise<SalesDashboardData>{
 if(!databaseUrl())return empty;
 const db=getDb(),from=new Date(`${businessDate()}T00:00:00+05:00`);
 const [[today],[all],recent]=await Promise.all([
  db.select({count:sql<number>`count(*)`,revenue:sql<number>`coalesce(sum(${sales.subtotal}),0)`,profit:sql<number>`coalesce(sum(${sales.grossProfit}),0)`}).from(sales).where(and(eq(sales.status,"ACTIVE"),gte(sales.soldAt,from))),
  db.select({profit:sql<number>`coalesce(sum(${sales.grossProfit}),0)`}).from(sales).where(eq(sales.status,"ACTIVE")),
  db.select({id:sales.id,soldAt:sales.soldAt,brand:products.brand,model:products.model,category:products.category,storage:products.storage,color:products.color,quantity:sql<number>`sum(${saleItems.quantity})`,total:sales.subtotal,profit:sales.grossProfit,imageUrl:sql<string|null>`(select ${media.url} from ${media} where ${media.productId}=${products.id} order by ${media.sortOrder} asc limit 1)`}).from(sales).innerJoin(saleItems,eq(saleItems.saleId,sales.id)).innerJoin(products,eq(products.id,saleItems.productId)).where(eq(sales.status,"ACTIVE")).groupBy(sales.id,products.id).orderBy(desc(sales.soldAt)).limit(5)
 ]);
 return {todayCount:Number(today.count),todayRevenue:Number(today.revenue),todayProfit:Number(today.profit),totalProfit:Number(all.profit),recent:recent.map(x=>({...x,quantity:Number(x.quantity),total:Number(x.total),profit:Number(x.profit)}))};
}
