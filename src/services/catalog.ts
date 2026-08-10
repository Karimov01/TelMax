import { and, asc, desc, eq, gt, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { products, purchaseBatches } from "@/db/schema";
import { databaseUrl } from "@/db/url";

type InventoryNumbers={id:number;salePrice:number;warrantyDays:number;quantity:number;purchasePrice:number};
export function normalizeInventoryNumbers<T extends InventoryNumbers>(row:T):T {
  const numericFields=(['id','salePrice','warrantyDays','quantity','purchasePrice'] as const);
  const normalized={...row};
  for(const field of numericFields){
    const value=Number(row[field]);
    if(!Number.isFinite(value))throw new TypeError(`Inventory API: ${field} raqam emas`);
    normalized[field]=value as T[typeof field];
  }
  return normalized;
}

export type InventoryOptions={condition?:string;platform?:"ANDROID"|"IOS"|"FEATURE";sort?:"newest"|"price_asc"|"price_desc"|"stock_asc"|"stock_desc";lowStock?:boolean;page?:number;limit?:number};
export async function listInventoryPage(search = "", category?: "SMARTPHONE" | "FEATURE_PHONE",options:InventoryOptions={}) {
  const db = getDb();
  const inventory=db.select({
    productId:purchaseBatches.productId,
    quantity:sql<number>`sum(${purchaseBatches.availableQuantity})`.mapWith(Number).as("quantity"),
    purchasePrice:sql<number>`(array_agg(${purchaseBatches.unitCost}+${purchaseBatches.extraUnitCost} order by ${purchaseBatches.receivedAt},${purchaseBatches.id}))[1]`.mapWith(Number).as("purchase_price"),
    supplierName:sql<string|null>`(array_agg(${purchaseBatches.supplierName} order by ${purchaseBatches.receivedAt},${purchaseBatches.id}))[1]`.as("supplier_name"),
    supplierPhone:sql<string|null>`(array_agg(${purchaseBatches.supplierPhone} order by ${purchaseBatches.receivedAt},${purchaseBatches.id}))[1]`.as("supplier_phone")
  }).from(purchaseBatches).where(gt(purchaseBatches.availableQuantity,0)).groupBy(purchaseBatches.productId).as("inventory_snapshot");
  const term=`%${search}%`;
  const conditions=[options.lowStock?sql`${inventory.quantity}<=${Math.max(1,Number(process.env.LOW_STOCK_THRESHOLD||2))}`:undefined,search?or(ilike(products.brand,term),ilike(products.model,term),ilike(products.storage,term),ilike(products.color,term),sql`exists(select 1 from inventory_units iu where iu.product_id=${products.id} and (iu.imei1 ilike ${term} or iu.product_code ilike ${term}))`):undefined,category?eq(products.category,category):undefined,options.condition?eq(products.condition,options.condition):undefined,options.platform?eq(products.platform,options.platform):undefined].filter(Boolean);
  const limit=Math.min(50,Math.max(1,options.limit??20)),page=Math.max(1,options.page??1),where=and(...conditions),order=options.sort==="price_asc"?asc(products.salePrice):options.sort==="price_desc"?desc(products.salePrice):options.sort==="stock_asc"?asc(inventory.quantity):options.sort==="stock_desc"?desc(inventory.quantity):desc(products.updatedAt);
  const [rawItems,countRows]=await Promise.all([db.select({ id: products.id, category: products.category, platform:products.platform, brand: products.brand, model: products.model, slug: products.slug, description:products.description,storage:products.storage,ram:products.ram,color:products.color,condition:products.condition,warrantyDays:products.warrantyDays,salePrice: products.salePrice, isPublished: products.isPublished, quantity:inventory.quantity, imei: sql<string | null>`(select iu.imei1 from inventory_units iu where iu.product_id=${products.id} and iu.status='AVAILABLE' limit 1)`, batteryHealth:sql<string|null>`(select iu.battery_health from inventory_units iu where iu.product_id=${products.id} and iu.status='AVAILABLE' limit 1)`, faceId:sql<string|null>`(select iu.face_id from inventory_units iu where iu.product_id=${products.id} and iu.status='AVAILABLE' limit 1)`, trueTone:sql<string|null>`(select iu.true_tone from inventory_units iu where iu.product_id=${products.id} and iu.status='AVAILABLE' limit 1)`, icloud:sql<string|null>`(select iu.icloud from inventory_units iu where iu.product_id=${products.id} and iu.status='AVAILABLE' limit 1)`, repair:sql<string|null>`(select iu.repair from inventory_units iu where iu.product_id=${products.id} and iu.status='AVAILABLE' limit 1)`, technicalState:sql<string|null>`(select iu.technical_state from inventory_units iu where iu.product_id=${products.id} and iu.status='AVAILABLE' limit 1)`, code: sql<string | null>`(select iu.product_code from inventory_units iu where iu.product_id=${products.id} and iu.status='AVAILABLE' limit 1)`, imageUrl:sql<string|null>`(select m.url from media m where m.product_id=${products.id} order by m.sort_order limit 1)`,purchasePrice:inventory.purchasePrice,supplierName:inventory.supplierName,supplierPhone:inventory.supplierPhone }).from(products).innerJoin(inventory,eq(inventory.productId,products.id)).where(where).orderBy(order).limit(limit).offset((page-1)*limit),db.select({total:sql<number>`count(*)`}).from(products).innerJoin(inventory,eq(inventory.productId,products.id)).where(where)]);
  const items=rawItems.map(normalizeInventoryNumbers);
  return {items,total:Number(countRows[0]?.total??0),page,limit};
}

export async function listInventory(search="",category?:"SMARTPHONE"|"FEATURE_PHONE"){return (await listInventoryPage(search,category,{limit:50})).items;}

export async function inventoryStats(){const db=getDb();const rows=await db.execute(sql`select p.category,p.brand,coalesce(p.condition,'Kiritilmagan') condition,sum(pb.available_quantity)::int quantity,sum(pb.available_quantity*(pb.unit_cost+pb.extra_unit_cost))::bigint value from purchase_batches pb join products p on p.id=pb.product_id where pb.available_quantity>0 group by p.category,p.brand,coalesce(p.condition,'Kiritilmagan')`),data=rows.rows as unknown as {category:"SMARTPHONE"|"FEATURE_PHONE";brand:string;condition:string;quantity:number;value:number}[];return {total:data.reduce((n,x)=>n+Number(x.quantity),0),value:data.reduce((n,x)=>n+Number(x.value),0),smartphones:data.filter(x=>x.category==="SMARTPHONE").reduce((n,x)=>n+Number(x.quantity),0),featurePhones:data.filter(x=>x.category==="FEATURE_PHONE").reduce((n,x)=>n+Number(x.quantity),0),brands:Object.values(data.reduce<Record<string,{name:string;quantity:number;value:number}>>((a,x)=>{const k=x.brand||"Boshqa";a[k]??={name:k,quantity:0,value:0};a[k].quantity+=Number(x.quantity);a[k].value+=Number(x.value);return a},{})).sort((a,b)=>b.quantity-a.quantity),conditions:Object.values(data.reduce<Record<string,{name:string;quantity:number}>>((a,x)=>{a[x.condition]??={name:x.condition,quantity:0};a[x.condition].quantity+=Number(x.quantity);return a},{}))};}

export async function listPublicProducts(category?: "SMARTPHONE" | "FEATURE_PHONE") {
  if(!databaseUrl()) return [];
  const db = getDb();
  return db.select({ id: products.id, slug: products.slug, category: products.category, brand: products.brand, model: products.model, description: products.description, storage: products.storage, ram: products.ram, color: products.color, condition: products.condition, price: products.salePrice, warrantyDays: products.warrantyDays, quantity: sql<number>`coalesce((select sum(pb.available_quantity) from purchase_batches pb where pb.product_id=${products.id}),0)`, imageUrl: sql<string | null>`(select m.url from media m where m.product_id=${products.id} order by m.sort_order limit 1)` })
    .from(products).where(and(eq(products.isPublished, true), category ? eq(products.category, category) : undefined, sql`coalesce((select sum(pb.available_quantity) from purchase_batches pb where pb.product_id=${products.id}),0)>0`)).orderBy(asc(products.brand), asc(products.model));
}

export async function getPublicProduct(slug:string){if(!databaseUrl())return undefined; const db=getDb(); const [product]=await db.select({id:products.id,slug:products.slug,category:products.category,brand:products.brand,model:products.model,description:products.description,storage:products.storage,ram:products.ram,color:products.color,condition:products.condition,price:products.salePrice,warrantyDays:products.warrantyDays,quantity:sql<number>`coalesce((select sum(pb.available_quantity) from purchase_batches pb where pb.product_id=${products.id}),0)`,imageUrl:sql<string|null>`(select m.url from media m where m.product_id=${products.id} order by m.sort_order limit 1)`}).from(products).where(and(eq(products.slug,slug),eq(products.isPublished,true))).limit(1); return product; }
