import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { validateTelegramInitData } from "@/lib/telegram-auth";
import { createSession, sessionCookie } from "@/lib/session";

export async function POST(request:Request){
  try {
    const body=await request.json();
    const {user}=validateTelegramInitData(String(body.initData??""));
    const db=getDb();
    const owner=String(user.id)===process.env.TELMAX_OWNER_TELEGRAM_ID;
    const existing=await db.query.users.findFirst({where:eq(users.telegramId,user.id)});
    let record;
    if(existing){
      [record]=await db.update(users).set({firstName:user.first_name,lastName:user.last_name??null,username:user.username??null,role:owner?"OWNER":existing.role,updatedAt:new Date()}).where(eq(users.id,existing.id)).returning();
    }else{
      [record]=await db.insert(users).values({telegramId:user.id,firstName:user.first_name,lastName:user.last_name,username:user.username,role:owner?"OWNER":"CUSTOMER"}).returning();
    }
    if(!record.active) return NextResponse.json({error:"Hisob faol emas"},{status:403});
    const response=NextResponse.json({ok:true,user:{name:record.firstName,role:record.role}});
    response.cookies.set(sessionCookie.name,createSession({userId:record.id,telegramId:record.telegramId,role:record.role,name:record.firstName}),sessionCookie.options);
    return response;
  } catch(error){ console.error("Telegram auth failed",error); return NextResponse.json({error:"Telegram orqali tasdiqlash amalga oshmadi"},{status:401}); }
}
