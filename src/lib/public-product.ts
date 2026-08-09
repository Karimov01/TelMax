import type {InferSelectModel} from "drizzle-orm"; import type {products} from "@/db/schema";
type Product=InferSelectModel<typeof products>;
export function toPublicProduct(product:Product,availableQuantity:number,imageUrl?:string){return {id:product.id,slug:product.slug,category:product.category,brand:product.brand,model:product.model,description:product.description,storage:product.storage,ram:product.ram,color:product.color,condition:product.condition,price:product.salePrice,warrantyDays:product.warrantyDays,available:availableQuantity>0,imageUrl};}
