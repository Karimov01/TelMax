import { randomBytes } from "node:crypto";
import { and, eq, or } from "drizzle-orm";
import { auditLogs, inventoryMovements, inventoryUnits, media, products, purchaseBatches } from "@/db/schema";
import {withTransaction} from "@/db/transaction";
import { can, type Role } from "@/lib/permissions";

export type PurchaseInput={category:"SMARTPHONE"|"FEATURE_PHONE";platform?:"ANDROID"|"IOS"|"FEATURE";brand:string;model:string;description?:string;storage?:string;ram?:string;color?:string;condition?:string;purchasePrice:number;extraCost:number;salePrice:number;quantity:number;imei1?:string;imei2?:string;uzimei?:string;uzimeiMethod?:string;batteryHealth?:string;faceId?:string;trueTone?:string;icloud?:string;repair?:string;packageInfo?:string;technicalState?:string;supplierName?:string;supplierPhone?:string;warrantyDays?:number;imageUrl?:string;isPublished:boolean;actor:{id:number;role:Role}};
const slugify=(value:string)=>value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

export async function receivePhone(input:PurchaseInput){
 if(!can(input.actor.role,"inventory:write"))throw new Error("Bu amal uchun ruxsat yo‘q");
 if(!input.model.trim()||input.purchasePrice<=0||input.salePrice<=0||input.quantity<1)throw new Error("Majburiy maydonlarni to‘g‘ri kiriting");
 return withTransaction(async tx=>{
  const brand=input.brand.trim();
  const model=input.model.trim();
  const baseSlug=slugify(`${brand}-${model}`)||`telefon-${Date.now()}`;
  let product;

  // Sensorli telefonlar individual qurilma sifatida saqlanadi.
  // Bir xil model qayta kelganda eski product/media yozuvini bosib ketmaydi.
  if(input.category==="SMARTPHONE"){
   const uniqueSuffix=(input.imei1?.trim().slice(-6)||randomBytes(3).toString("hex")).toLowerCase();
   let slug=`${baseSlug}-${uniqueSuffix}`;
   const exists=await tx.select({id:products.id}).from(products).where(eq(products.slug,slug)).limit(1);
   if(exists.length)slug=`${baseSlug}-${uniqueSuffix}-${randomBytes(2).toString("hex")}`;
   [product]=await tx.insert(products).values({
    category:input.category,
    platform:input.platform??null,
    brand,
    model,
    slug,
    description:input.description,
    storage:input.storage,
    ram:input.ram,
    color:input.color,
    condition:input.condition,
    salePrice:input.salePrice,
    warrantyDays:input.warrantyDays??0,
    isPublished:input.isPublished
   }).returning();
  }else{
   // Tugmali telefonlar optom miqdorda kelishi mumkin, shuning uchun model bo‘yicha guruhlanadi.
   [product]=await tx.select().from(products).where(and(eq(products.category,input.category),eq(products.brand,brand),eq(products.model,model))).limit(1);
   if(!product){
    let slug=baseSlug;
    const exists=await tx.select({id:products.id}).from(products).where(eq(products.slug,slug)).limit(1);
    if(exists.length)slug=`${baseSlug}-${Date.now().toString(36)}`;
    [product]=await tx.insert(products).values({
     category:input.category,
     platform:input.platform??"FEATURE",
     brand,
     model,
     slug,
     description:input.description,
     storage:input.storage,
     ram:input.ram,
     color:input.color,
     condition:input.condition,
     salePrice:input.salePrice,
     warrantyDays:input.warrantyDays??0,
     isPublished:input.isPublished
    }).returning();
   }else{
    [product]=await tx.update(products).set({
     platform:input.platform??product.platform,
     salePrice:input.salePrice,
     warrantyDays:input.warrantyDays??product.warrantyDays,
     isPublished:input.isPublished,
     description:input.description||product.description,
     storage:input.storage||product.storage,
     ram:input.ram||product.ram,
     color:input.color||product.color,
     condition:input.condition||product.condition,
     updatedAt:new Date()
    }).where(eq(products.id,product.id)).returning();
   }
  }

  const [batch]=await tx.insert(purchaseBatches).values({
   productId:product.id,
   unitCost:input.purchasePrice,
   extraUnitCost:input.extraCost,
   initialQuantity:input.quantity,
   availableQuantity:input.quantity,
   supplierName:input.supplierName||null,
   supplierPhone:input.supplierPhone||null,
   receivedBy:input.actor.id
  }).returning();

  if(input.category==="SMARTPHONE"){
   const imei1=input.imei1?.trim()||null;
   const imei2=input.imei2?.trim()||null;
   if(imei1&&imei2&&imei1===imei2)throw new Error("IMEI 1 va IMEI 2 bir xil bo‘lishi mumkin emas");
   for(const imei of [imei1,imei2].filter((value):value is string=>Boolean(value))){
    const [duplicate]=await tx.select({id:inventoryUnits.id}).from(inventoryUnits).where(or(eq(inventoryUnits.imei1,imei),eq(inventoryUnits.imei2,imei))).limit(1);
    if(duplicate)throw new Error(`IMEI ${imei} oldin omborga kiritilgan`);
   }
   for(let index=0;index<input.quantity;index++){
    const code=`TM-${randomBytes(7).toString("hex").toUpperCase()}`;
    await tx.insert(inventoryUnits).values({
     productId:product.id,batchId:batch.id,productCode:code,
     imei1:index===0?imei1:null,imei2:index===0?imei2:null,
     uzimei:input.uzimei||null,uzimeiMethod:input.uzimeiMethod||null,
     batteryHealth:input.batteryHealth||null,faceId:input.faceId||null,trueTone:input.trueTone||null,
     icloud:input.icloud||null,repair:input.repair||null,packageInfo:input.packageInfo||null,
     technicalState:input.technicalState||null,status:"AVAILABLE"
    });
   }
  }

  if(input.imageUrl){
   // Yangi sensorli telefon alohida product bo‘lgani uchun bu rasm boshqa telefon rasmini o‘chirmaydi.
   // Tugmali telefonlarda esa model bo‘yicha bitta katalog rasmi saqlanadi.
   await tx.delete(media).where(eq(media.productId,product.id));
   await tx.insert(media).values({productId:product.id,url:input.imageUrl,alt:`${brand} ${model}`});
  }

  await tx.insert(inventoryMovements).values({productId:product.id,batchId:batch.id,type:"PURCHASE",quantity:input.quantity,actorId:input.actor.id,details:{unitCost:input.purchasePrice}});
  await tx.insert(auditLogs).values({actorId:input.actor.id,action:"PHONE_RECEIVED",entityType:"PRODUCT",entityId:product.id,details:{quantity:input.quantity,purchasePrice:input.purchasePrice}});
  return {productId:product.id,quantity:input.quantity};
 });
}
