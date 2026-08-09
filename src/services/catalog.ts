import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { products } from "@/db/schema";
import { databaseUrl } from "@/db/url";

export async function listInventory(search = "", category?: "SMARTPHONE" | "FEATURE_PHONE") {
  const db = getDb();
  const conditions = [sql`coalesce((select sum(pb.available_quantity) from purchase_batches pb where pb.product_id=${products.id}),0)>0`,search ? or(ilike(products.brand, `%${search}%`), ilike(products.model, `%${search}%`), sql`exists(select 1 from inventory_units iu where iu.product_id=${products.id} and (iu.imei1 ilike ${`%${search}%`} or iu.product_code ilike ${`%${search}%`}))`) : undefined, category ? eq(products.category, category) : undefined].filter(Boolean);
  return db.select({ id: products.id, category: products.category, brand: products.brand, model: products.model, slug: products.slug, description:products.description,storage:products.storage,ram:products.ram,color:products.color,condition:products.condition,warrantyDays:products.warrantyDays,salePrice: products.salePrice, isPublished: products.isPublished, quantity: sql<number>`coalesce((select sum(pb.available_quantity) from purchase_batches pb where pb.product_id=${products.id}),0)`, imei: sql<string | null>`(select iu.imei1 from inventory_units iu where iu.product_id=${products.id} and iu.status='AVAILABLE' limit 1)`, code: sql<string | null>`(select iu.product_code from inventory_units iu where iu.product_id=${products.id} and iu.status='AVAILABLE' limit 1)` })
    .from(products).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(products.updatedAt));
}

export async function listPublicProducts(category?: "SMARTPHONE" | "FEATURE_PHONE") {
  if(!databaseUrl()) return [];
  const db = getDb();
  return db.select({ id: products.id, slug: products.slug, category: products.category, brand: products.brand, model: products.model, description: products.description, storage: products.storage, ram: products.ram, color: products.color, condition: products.condition, price: products.salePrice, warrantyDays: products.warrantyDays, quantity: sql<number>`coalesce((select sum(pb.available_quantity) from purchase_batches pb where pb.product_id=${products.id}),0)`, imageUrl: sql<string | null>`(select m.url from media m where m.product_id=${products.id} order by m.sort_order limit 1)` })
    .from(products).where(and(eq(products.isPublished, true), category ? eq(products.category, category) : undefined, sql`coalesce((select sum(pb.available_quantity) from purchase_batches pb where pb.product_id=${products.id}),0)>0`)).orderBy(asc(products.brand), asc(products.model));
}

export async function getPublicProduct(slug:string){if(!databaseUrl())return undefined; const db=getDb(); const [product]=await db.select({id:products.id,slug:products.slug,category:products.category,brand:products.brand,model:products.model,description:products.description,storage:products.storage,ram:products.ram,color:products.color,condition:products.condition,price:products.salePrice,warrantyDays:products.warrantyDays,quantity:sql<number>`coalesce((select sum(pb.available_quantity) from purchase_batches pb where pb.product_id=${products.id}),0)`,imageUrl:sql<string|null>`(select m.url from media m where m.product_id=${products.id} order by m.sort_order limit 1)`}).from(products).where(and(eq(products.slug,slug),eq(products.isPublished,true))).limit(1); return product; }
