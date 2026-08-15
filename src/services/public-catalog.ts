import {and, asc, desc, eq, ilike, or, sql} from "drizzle-orm";
import {getDb} from "@/db/client";
import {databaseUrl} from "@/db/url";
import {inventoryUnits, media, products, purchaseBatches} from "@/db/schema";

export type PublicCatalogSort="newest"|"price_asc"|"price_desc"|"name_asc";
export type PublicCatalogFilters={
  q?:string;
  category?:"SMARTPHONE"|"FEATURE_PHONE";
  platform?:"ANDROID"|"IOS"|"FEATURE";
  brand?:string;
  condition?:string;
  storage?:string;
  color?:string;
  minPrice?:number;
  maxPrice?:number;
  sort?:PublicCatalogSort;
};

export async function listPublicCatalog(filters:PublicCatalogFilters={}){
  if(!databaseUrl()) return [];
  const db=getDb();
  const term=filters.q?.trim()?`%${filters.q.trim()}%`:undefined;
  const conditions=[
    eq(products.isPublished,true),
    sql`coalesce((select sum(pb.available_quantity) from purchase_batches pb where pb.product_id=${products.id}),0)>0`,
    filters.category?eq(products.category,filters.category):undefined,
    filters.platform?eq(products.platform,filters.platform):undefined,
    filters.brand?eq(products.brand,filters.brand):undefined,
    filters.condition?eq(products.condition,filters.condition):undefined,
    filters.storage?eq(products.storage,filters.storage):undefined,
    filters.color?eq(products.color,filters.color):undefined,
    Number.isFinite(filters.minPrice)?sql`${products.salePrice}>=${Number(filters.minPrice)}`:undefined,
    Number.isFinite(filters.maxPrice)?sql`${products.salePrice}<=${Number(filters.maxPrice)}`:undefined,
    term?or(
      ilike(products.brand,term),
      ilike(products.model,term),
      ilike(products.storage,term),
      ilike(products.ram,term),
      ilike(products.color,term),
      ilike(products.condition,term),
      sql`concat_ws(' ',${products.brand},${products.model},${products.storage},${products.ram},${products.color}) ilike ${term}`
    ):undefined
  ].filter(Boolean);
  const order=filters.sort==="price_asc"?asc(products.salePrice):filters.sort==="price_desc"?desc(products.salePrice):filters.sort==="name_asc"?asc(products.model):desc(products.updatedAt);
  const rows=await db.select({
    id:products.id,slug:products.slug,category:products.category,platform:products.platform,brand:products.brand,model:products.model,
    description:products.description,storage:products.storage,ram:products.ram,color:products.color,condition:products.condition,
    price:products.salePrice,warrantyDays:products.warrantyDays,
    quantity:sql<number>`coalesce((select sum(pb.available_quantity) from purchase_batches pb where pb.product_id=${products.id}),0)`,
    imageUrl:sql<string|null>`(select m.url from media m where m.product_id=${products.id} order by m.sort_order,m.id limit 1)`
  }).from(products).where(and(...conditions)).orderBy(order);
  return rows.map(x=>({...x,price:Number(x.price),quantity:Number(x.quantity),warrantyDays:Number(x.warrantyDays)}));
}

export async function getPublicCatalogFacets(){
  const items=await listPublicCatalog();
  const unique=(values:(string|null|undefined)[])=>[...new Set(values.filter((v):v is string=>Boolean(v)))].sort((a,b)=>a.localeCompare(b));
  return {brands:unique(items.map(x=>x.brand)),storages:unique(items.map(x=>x.storage)),colors:unique(items.map(x=>x.color)),conditions:unique(items.map(x=>x.condition))};
}

export async function getPublicProductDetail(slug:string){
  if(!databaseUrl()) return undefined;
  const db=getDb();
  const [p]=await db.select({
    id:products.id,slug:products.slug,category:products.category,platform:products.platform,brand:products.brand,model:products.model,
    description:products.description,storage:products.storage,ram:products.ram,color:products.color,condition:products.condition,
    price:products.salePrice,warrantyDays:products.warrantyDays,
    quantity:sql<number>`coalesce((select sum(pb.available_quantity) from purchase_batches pb where pb.product_id=${products.id}),0)`,
    batteryHealth:sql<string|null>`(select iu.battery_health from inventory_units iu where iu.product_id=${products.id} and iu.status='AVAILABLE' order by iu.id limit 1)`,
    faceId:sql<string|null>`(select iu.face_id from inventory_units iu where iu.product_id=${products.id} and iu.status='AVAILABLE' order by iu.id limit 1)`,
    trueTone:sql<string|null>`(select iu.true_tone from inventory_units iu where iu.product_id=${products.id} and iu.status='AVAILABLE' order by iu.id limit 1)`,
    icloud:sql<string|null>`(select iu.icloud from inventory_units iu where iu.product_id=${products.id} and iu.status='AVAILABLE' order by iu.id limit 1)`,
    uzimei:sql<string|null>`(select iu.uzimei from inventory_units iu where iu.product_id=${products.id} and iu.status='AVAILABLE' order by iu.id limit 1)`,
    repair:sql<string|null>`(select iu.repair from inventory_units iu where iu.product_id=${products.id} and iu.status='AVAILABLE' order by iu.id limit 1)`,
    technicalState:sql<string|null>`(select iu.technical_state from inventory_units iu where iu.product_id=${products.id} and iu.status='AVAILABLE' order by iu.id limit 1)`
  }).from(products).where(and(eq(products.slug,slug),eq(products.isPublished,true))).limit(1);
  if(!p) return undefined;
  const images=await db.select({url:media.url,alt:media.alt}).from(media).where(eq(media.productId,p.id)).orderBy(asc(media.sortOrder),asc(media.id));
  return {...p,price:Number(p.price),quantity:Number(p.quantity),warrantyDays:Number(p.warrantyDays),images};
}
