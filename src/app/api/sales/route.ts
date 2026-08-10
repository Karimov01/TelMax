import {NextResponse} from "next/server";
import {z} from "zod";
import {getSession} from "@/lib/session";
import {sellProduct} from "@/services/inventory";

const input=z.object({
 productId:z.coerce.number().int().positive(),quantity:z.coerce.number().int().positive(),unitSalePrice:z.coerce.number().int().positive(),
 customerName:z.string().trim().max(160).optional().default(""),
 customerPhone:z.string().trim().max(30).refine(v=>!v||/^\+?[\d\s()-]{7,25}$/.test(v),"Telefon raqamini tekshiring").optional().default(""),
 notes:z.string().trim().max(500).optional().default(""),idempotencyKey:z.string().uuid(),
 paymentMethod:z.enum(["CASH","CARD","MIXED","TRANSFER","OTHER"])
});
export async function POST(request:Request){
 const session=await getSession();if(!session)return NextResponse.json({error:"Ruxsat yo‘q"},{status:401});
 try{const data=input.parse(await request.json());const result=await sellProduct({...data,actor:{id:session.userId,role:session.role}});return NextResponse.json({ok:true,...result});}
 catch(error){console.error(error);const message=error instanceof z.ZodError?error.issues[0]?.message??"Sotuv ma’lumotlarini tekshiring":error instanceof Error?error.message:"Sotuvda xato";return NextResponse.json({error:message},{status:400});}
}
