import { Pool } from "@neondatabase/serverless";
import { randomBytes } from "node:crypto";
import { drizzle } from "drizzle-orm/neon-serverless";
import { and, eq, or } from "drizzle-orm";
import { auditLogs, inventoryMovements, inventoryUnits, media, products, purchaseBatches } from "@/db/schema";
import { requireDatabaseUrl } from "@/db/url";
import { can, type Role } from "@/lib/permissions";

export type PurchaseInput={category:"SMARTPHONE"|"FEATURE_PHONE";brand:string;model:string;description?:string;storage?:string;ram?:string;color?:string;condition?:string;purchasePrice:number;extraCost:number;salePrice:number;quantity:number;imei1?:string;imei2?:string;imageUrl?:string;isPublished:boolean;actor:{id:number;role:Role}};
const slugify=(value:string)=>value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
export async function receivePhone(input:PurchaseInput){if(!can(input.actor.role,"inventory:write"))throw new Error("Bu amal uchun ruxsat yo‘q");if(!input.model.trim()||input.purchasePrice<=0||input.salePrice<=0||input.quantity<1)throw new Error("Majburiy maydonlarni to‘g‘ri kiriting");if(input.category==="SMARTPHONE"&&input.quantity!==1)throw new Error("Sensorli telefon IMEI bo‘yicha bittadan qabul qilinadi");
 const pool=new Pool({connectionString:requireDatabaseUrl()});const db=drizzle(pool);try{return await db.transaction(async tx=>{const baseSlug=slugify(`${input.brand}-${input.model}`)||`telefon-${Date.now()}`;let [product]=await tx.select().from(products).where(and(eq(products.category,input.category),eq(products.brand,input.brand.trim()),eq(products.model,input.model.trim()))).limit(1);if(!product){let slug=baseSlug;const exists=await tx.select({id:products.id}).from(products).where(eq(products.slug,slug)).limit(1);if(exists.length)slug=`${baseSlug}-${Date.now().toString(36)}`;[product]=await tx.insert(products).values({category:input.category,brand:input.brand.trim(),model:input.model.trim(),slug,description:input.description,storage:input.storage,ram:input.ram,color:input.color,condition:input.condition,salePrice:input.salePrice,isPublished:input.isPublished}).returning();}else{[product]=await tx.update(products).set({salePrice:input.salePrice,isPublished:input.isPublished,description:input.description||product.description,storage:input.storage||product.storage,ram:input.ram||product.ram,color:input.color||product.color,condition:input.condition||product.condition,updatedAt:new Date()}).where(eq(products.id,product.id)).returning();}
 const [batch]=await tx.insert(purchaseBatches).values({productId:product.id,unitCost:input.purchasePrice,extraUnitCost:input.extraCost,initialQuantity:input.quantity,availableQuantity:input.quantity,receivedBy:input.actor.id}).returning();
 if(input.category==="SMARTPHONE"){
  const imei1=input.imei1?.trim()||null;const imei2=input.imei2?.trim()||null;
  if(imei1&&imei2&&imei1===imei2)throw new Error("IMEI 1 va IMEI 2 bir xil bo‘lishi mumkin emas");
  for(const imei of [imei1,imei2].filter((value):value is string=>Boolean(value))){const [duplicate]=await tx.select({id:inventoryUnits.id}).from(inventoryUnits).where(or(eq(inventoryUnits.imei1,imei),eq(inventoryUnits.imei2,imei))).limit(1);if(duplicate)throw new Error(`IMEI ${imei} oldin omborga kiritilgan`);}
  const code=`TM-${randomBytes(7).toString("hex").toUpperCase()}`;await tx.insert(inventoryUnits).values({productId:product.id,batchId:batch.id,productCode:code,imei1,imei2,status:"AVAILABLE"});
 }
 if(input.imageUrl){await tx.delete(media).where(eq(media.productId,product.id));await tx.insert(media).values({productId:product.id,url:input.imageUrl,alt:`${input.brand} ${input.model}`});}
 await tx.insert(inventoryMovements).values({productId:product.id,batchId:batch.id,type:"PURCHASE",quantity:input.quantity,actorId:input.actor.id,details:{unitCost:input.purchasePrice}});await tx.insert(auditLogs).values({actorId:input.actor.id,action:"PHONE_RECEIVED",entityType:"PRODUCT",entityId:product.id,details:{quantity:input.quantity,purchasePrice:input.purchasePrice}});return {productId:product.id,quantity:input.quantity};});}finally{await pool.end();}}
