import {NextResponse} from "next/server";
import {z} from "zod";
import {and,eq,sql} from "drizzle-orm";
import {getSession} from "@/lib/session";
import {can} from "@/lib/permissions";
import {inventoryStats,listInventoryPage} from "@/services/catalog";
import {getDb} from "@/db/client";
import {auditLogs,inventoryMovements,inventoryUnits,media,products,purchaseBatches} from "@/db/schema";

export async function GET(request:Request){
 const session=await getSession();if(!session||!can(session.role,"inventory:read"))return NextResponse.json({error:"Ruxsat yo‘q"},{status:403});
 const u=new URL(request.url),category=(u.searchParams.get("category")||undefined) as "SMARTPHONE"|"FEATURE_PHONE"|undefined,platform=(u.searchParams.get("platform")||undefined) as "ANDROID"|"IOS"|"FEATURE"|undefined,sort=(u.searchParams.get("sort")||"newest") as "newest"|"price_asc"|"price_desc"|"stock_asc"|"stock_desc";
 try{const [result,stats]=await Promise.all([listInventoryPage(u.searchParams.get("q")??"",category,{condition:u.searchParams.get("condition")||undefined,platform,sort,page:Number(u.searchParams.get("page")||1),limit:20}),inventoryStats()]);return NextResponse.json({...result,stats});}
 catch(error){console.error(error);return NextResponse.json({error:"Ombor ma’lumotini olishda xato"},{status:500});}
}

const edit=z.object({id:z.number().int().positive(),brand:z.string().max(100),model:z.string().min(1).max(160),description:z.string().max(2000).nullable().optional(),storage:z.string().max(50).nullable().optional(),ram:z.string().max(50).nullable().optional(),color:z.string().max(80).nullable().optional(),condition:z.string().max(50).nullable().optional(),salePrice:z.number().int().positive(),purchasePrice:z.number().int().positive().optional(),quantity:z.number().int().positive().optional(),imageUrl:z.string().url().max(2048).nullable().optional(),adjustmentReason:z.string().max(300).optional(),warrantyDays:z.number().int().min(0),isPublished:z.boolean()});
export async function PATCH(request:Request){
 const s=await getSession();if(!s||!can(s.role,"inventory:write"))return NextResponse.json({error:"Ruxsat yo‘q"},{status:403});
 try{const d=edit.parse(await request.json()),db=getDb();await db.transaction(async tx=>{
  const [old]=await tx.select().from(products).where(eq(products.id,d.id)).limit(1);if(!old)throw new Error("Mahsulot topilmadi");
  const [stock]=await tx.select({quantity:sql<number>`coalesce(sum(${purchaseBatches.availableQuantity}),0)`}).from(purchaseBatches).where(eq(purchaseBatches.productId,d.id)),oldQuantity=Number(stock.quantity);
  if(d.quantity!==undefined&&d.quantity!==oldQuantity){
   if(old.category==="SMARTPHONE")throw new Error("Sensorli telefon qoldig‘i IMEI bilan Telefon olish/sotish orqali o‘zgartiriladi");
   if(!d.adjustmentReason?.trim())throw new Error("Qoldiq o‘zgarishi sababini kiriting");
   const delta=d.quantity-oldQuantity;
   if(delta>0){const [batch]=await tx.select().from(purchaseBatches).where(and(eq(purchaseBatches.productId,d.id),sql`${purchaseBatches.availableQuantity}>0`)).limit(1);if(!batch)throw new Error("Qoldiq qo‘shish uchun avval telefonni qabul qiling");await tx.update(purchaseBatches).set({initialQuantity:sql`${purchaseBatches.initialQuantity}+${delta}`,availableQuantity:sql`${purchaseBatches.availableQuantity}+${delta}`,updatedAt:new Date()}).where(eq(purchaseBatches.id,batch.id));await tx.insert(inventoryMovements).values({productId:d.id,batchId:batch.id,type:"ADJUSTMENT",quantity:delta,actorId:s.userId,details:{reason:d.adjustmentReason,oldQuantity,newQuantity:d.quantity}});}
   else{let remove=-delta;const batches=await tx.select().from(purchaseBatches).where(and(eq(purchaseBatches.productId,d.id),sql`${purchaseBatches.availableQuantity}>0`)).for("update");for(const b of batches){if(!remove)break;const take=Math.min(remove,b.availableQuantity);await tx.update(purchaseBatches).set({availableQuantity:sql`${purchaseBatches.availableQuantity}-${take}`,updatedAt:new Date()}).where(eq(purchaseBatches.id,b.id));remove-=take;await tx.insert(inventoryMovements).values({productId:d.id,batchId:b.id,type:"ADJUSTMENT",quantity:-take,actorId:s.userId,details:{reason:d.adjustmentReason,oldQuantity,newQuantity:d.quantity}});}}
  }
  await tx.update(products).set({brand:d.brand.trim(),model:d.model.trim(),description:d.description||null,storage:d.storage||null,ram:d.ram||null,color:d.color||null,condition:d.condition||null,salePrice:d.salePrice,warrantyDays:d.warrantyDays,isPublished:d.isPublished,updatedAt:new Date()}).where(eq(products.id,d.id));
  if(d.purchasePrice)await tx.update(purchaseBatches).set({unitCost:d.purchasePrice,updatedAt:new Date()}).where(and(eq(purchaseBatches.productId,d.id),sql`${purchaseBatches.availableQuantity}>0`));
  if(d.imageUrl){await tx.delete(media).where(eq(media.productId,d.id));await tx.insert(media).values({productId:d.id,url:d.imageUrl,alt:`${d.brand} ${d.model}`});}
  await tx.insert(auditLogs).values({actorId:s.userId,action:"PRODUCT_EDITED",entityType:"PRODUCT",entityId:d.id,details:{...d,oldQuantity}});
 });return NextResponse.json({ok:true});}catch(e){return NextResponse.json({error:e instanceof z.ZodError?"Maydonlarni tekshiring":e instanceof Error?e.message:"Tahrirlashda xato"},{status:400});}
}

export async function DELETE(request:Request){const s=await getSession();if(!s||!can(s.role,"inventory:write"))return NextResponse.json({error:"Ruxsat yo‘q"},{status:403});const id=Number(new URL(request.url).searchParams.get("id"));if(!Number.isInteger(id)||id<1)return NextResponse.json({error:"ID noto‘g‘ri"},{status:400});const db=getDb();await db.update(products).set({isPublished:false,updatedAt:new Date()}).where(eq(products.id,id));await db.update(purchaseBatches).set({availableQuantity:0,updatedAt:new Date()}).where(eq(purchaseBatches.productId,id));await db.update(inventoryUnits).set({status:"ARCHIVED",updatedAt:new Date()}).where(eq(inventoryUnits.productId,id));await db.insert(auditLogs).values({actorId:s.userId,action:"PRODUCT_ARCHIVED",entityType:"PRODUCT",entityId:id});return NextResponse.json({ok:true});}
