import {NextResponse} from "next/server";
import {z} from "zod";
import {getSession} from "@/lib/session";
import {getDebtDetail,listDebts,receiveDebtPayment,type DebtFilter} from "@/services/debts";

export const runtime="nodejs";
const paymentInput=z.object({debtId:z.coerce.number().int().positive(),amount:z.coerce.number().int().positive(),method:z.enum(["CASH","CARD","TRANSFER","OTHER"]),notes:z.string().trim().max(500).optional().default("")});

export async function GET(request:Request){
 const session=await getSession();
 if(!session||session.role==="CUSTOMER")return NextResponse.json({error:"Ruxsat yo‘q"},{status:401});
 try{
  const url=new URL(request.url),id=Number(url.searchParams.get("id")||0);
  if(id){const item=await getDebtDetail(id);return item?NextResponse.json(item):NextResponse.json({error:"Qarz topilmadi"},{status:404});}
  const filter=(url.searchParams.get("filter")||"all") as DebtFilter,q=url.searchParams.get("q")||"";
  return NextResponse.json(await listDebts({q,filter}));
 }catch(error){console.error("Debt API GET failed",error);return NextResponse.json({error:"Qarzdorlar ma’lumotini yuklab bo‘lmadi"},{status:500});}
}

export async function POST(request:Request){
 const session=await getSession();
 if(!session||session.role==="CUSTOMER")return NextResponse.json({error:"Ruxsat yo‘q"},{status:401});
 try{
  const data=paymentInput.parse(await request.json());
  return NextResponse.json({ok:true,...await receiveDebtPayment({...data,actor:{id:session.userId,role:session.role}})});
 }catch(error){console.error("Debt payment failed",error);const message=error instanceof z.ZodError?error.issues[0]?.message??"Ma’lumotni tekshiring":error instanceof Error?error.message:"To‘lovda xato";return NextResponse.json({error:message},{status:400});}
}
