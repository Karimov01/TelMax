import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { telegramUpdates } from "@/db/schema";
import { APP_URL } from "@/lib/constants";

export async function POST(request:Request){
 const secret=request.headers.get("x-telegram-bot-api-secret-token"); if(!process.env.TELEGRAM_WEBHOOK_SECRET||secret!==process.env.TELEGRAM_WEBHOOK_SECRET)return NextResponse.json({error:"Forbidden"},{status:403});
 const update=await request.json(); if(!Number.isInteger(update.update_id))return NextResponse.json({error:"Bad update"},{status:400}); const db=getDb();
 const existing=await db.query.telegramUpdates.findFirst({where:eq(telegramUpdates.updateId,update.update_id)}); if(existing?.status==="DONE")return NextResponse.json({ok:true});
 await db.insert(telegramUpdates).values({updateId:update.update_id}).onConflictDoNothing();
 try { const chatId=update.message?.chat?.id; const text=update.message?.text; if(chatId&&text==="/start"){ const token=process.env.TELEGRAM_BOT_TOKEN!; await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:chatId,text:"TelMax telefonlar katalogiga xush kelibsiz. Telefonlarni ko‘rish uchun Mini App’ni oching.",reply_markup:{inline_keyboard:[[{text:"📱 TelMax’ni ochish",web_app:{url:`${APP_URL}/app`}}]]}})}); }
   await db.update(telegramUpdates).set({status:"DONE",processedAt:new Date(),error:null}).where(eq(telegramUpdates.updateId,update.update_id)); return NextResponse.json({ok:true});
 } catch(error){ await db.update(telegramUpdates).set({status:"FAILED",error:error instanceof Error?error.message:"Unknown"}).where(eq(telegramUpdates.updateId,update.update_id)); console.error("Telegram webhook failed",error); return NextResponse.json({error:"Retry"},{status:500}); }
}
