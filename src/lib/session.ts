import crypto from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import type { Role } from "./permissions";

const COOKIE = "telmax_session";
type Session = { userId:number; telegramId:number; role:Role; name:string; exp:number };

function key(){
 const value=process.env.TELEGRAM_BOT_TOKEN;
 if(!value) throw new Error("Session secret sozlanmagan");
 return crypto.createHash("sha256").update(`telmax:${value}`).digest();
}

export function createSession(value: Omit<Session,"exp">){
 const payload=Buffer.from(JSON.stringify({...value,exp:Date.now()+12*60*60*1000})).toString("base64url");
 const sig=crypto.createHmac("sha256",key()).update(payload).digest("base64url");
 return `${payload}.${sig}`;
}

export function readSession(raw?:string):Session|null {
 if(!raw)return null;
 const [payload,sig]=raw.split(".");
 if(!payload||!sig)return null;
 const expected=crypto.createHmac("sha256",key()).update(payload).digest();
 const actual=Buffer.from(sig,"base64url");
 if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return null;
 const data=JSON.parse(Buffer.from(payload,"base64url").toString()) as Session;
 return data.exp>Date.now()?data:null;
}

export async function getSession():Promise<Session|null>{
 const cookieSession=readSession((await cookies()).get(COOKIE)?.value);
 if(!cookieSession)return null;
 try{
  const [account]=await getDb().select({
   id:users.id,
   telegramId:users.telegramId,
   role:users.role,
   firstName:users.firstName,
   active:users.active,
  }).from(users).where(eq(users.id,cookieSession.userId)).limit(1);
  if(!account||!account.active)return null;
  return {
   ...cookieSession,
   userId:account.id,
   telegramId:account.telegramId,
   role:account.role,
   name:account.firstName||cookieSession.name,
  };
 }catch(error){
  console.error("Session role refresh failed",error);
  return cookieSession;
 }
}

export const sessionCookie={name:COOKIE,options:{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge:43200}};
