import {NextResponse} from "next/server";
import {z} from "zod";
import {getSession} from "@/lib/session";
import {purchaseInputSchema} from "@/lib/purchase-contract";
import {receivePhone} from "@/services/purchases";

export async function POST(request:Request){
 const session=await getSession();if(!session)return NextResponse.json({error:"Ruxsat yo‘q"},{status:401});
 let raw:unknown;
 try{raw=await request.json();const data=purchaseInputSchema.parse(raw);const result=await receivePhone({...data,actor:{id:session.userId,role:session.role}});return NextResponse.json({ok:true,...result});}
 catch(error){
  if(error instanceof z.ZodError)console.error("Purchase validation failed",error.issues.map(issue=>{const received=issue.path.reduce<unknown>((value,key)=>value&&typeof value==="object"?(value as Record<PropertyKey,unknown>)[key]:undefined,raw);return {path:issue.path.join("."),code:issue.code,message:issue.message,expected:"expected" in issue?issue.expected:undefined,receivedType:received===null?"null":Array.isArray(received)?"array":typeof received}}));
  else console.error(error);
  const message=error instanceof z.ZodError?`${error.issues[0]?.path.join(".")||"payload"}: ${error.issues[0]?.message??"Kiritilgan ma’lumotlarni tekshiring"}`:error instanceof Error?error.message:"Telefonni saqlashda xato";
  return NextResponse.json({error:message},{status:400});
 }
}
