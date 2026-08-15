import {NextResponse} from "next/server";
import {and,desc,eq} from "drizzle-orm";
import {z} from "zod";
import {getDb} from "@/db/client";
import {users} from "@/db/schema";
import {getSession} from "@/lib/session";
import {can} from "@/lib/permissions";

const createSchema=z.object({telegramId:z.coerce.number().int().positive(),name:z.string().trim().min(2).max(120)});
const patchSchema=z.object({id:z.coerce.number().int().positive(),active:z.boolean()});

async function guard(){const session=await getSession();if(!session||!can(session.role,"user:manage"))return null;return session;}

export async function GET(){
 const session=await guard();if(!session)return NextResponse.json({error:"Ruxsat yo‘q"},{status:403});
 const rows=await getDb().select({id:users.id,telegramId:users.telegramId,firstName:users.firstName,lastName:users.lastName,username:users.username,role:users.role,active:users.active,createdAt:users.createdAt}).from(users).where(eq(users.role,"STAFF")).orderBy(desc(users.createdAt));
 return NextResponse.json({items:rows});
}

export async function POST(request:Request){
 const session=await guard();if(!session)return NextResponse.json({error:"Ruxsat yo‘q"},{status:403});
 try{
  const data=createSchema.parse(await request.json()),db=getDb();
  const existing=await db.query.users.findFirst({where:eq(users.telegramId,data.telegramId)});
  if(existing&&existing.role==="OWNER")return NextResponse.json({error:"Egasi akkauntini Sotuvchi qilib bo‘lmaydi"},{status:400});
  const [row]=existing
   ?await db.update(users).set({firstName:data.name,role:"STAFF",active:true,updatedAt:new Date()}).where(eq(users.id,existing.id)).returning()
   :await db.insert(users).values({telegramId:data.telegramId,firstName:data.name,role:"STAFF",active:true}).returning();
  return NextResponse.json({ok:true,item:row});
 }catch(error){const message=error instanceof z.ZodError?error.issues[0]?.message??"Ma’lumotni tekshiring":error instanceof Error?error.message:"Sotuvchi qo‘shilmadi";return NextResponse.json({error:message},{status:400});}
}

export async function PATCH(request:Request){
 const session=await guard();if(!session)return NextResponse.json({error:"Ruxsat yo‘q"},{status:403});
 try{
  const data=patchSchema.parse(await request.json());
  const [row]=await getDb().update(users).set({active:data.active,updatedAt:new Date()}).where(and(eq(users.id,data.id),eq(users.role,"STAFF"))).returning({id:users.id,active:users.active,role:users.role});
  if(!row)return NextResponse.json({error:"Sotuvchi topilmadi"},{status:404});
  return NextResponse.json({ok:true,item:row});
 }catch(error){const message=error instanceof z.ZodError?error.issues[0]?.message??"Ma’lumotni tekshiring":"Holat o‘zgarmadi";return NextResponse.json({error:message},{status:400});}
}
