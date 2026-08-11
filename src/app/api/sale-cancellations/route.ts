import {NextResponse} from "next/server";
import {z} from "zod";
import {getSession} from "@/lib/session";
import {can} from "@/lib/permissions";
import {listCancellableSales} from "@/services/sale-cancellations";
import {cancelSale} from "@/services/inventory";

function dates(request:Request){const u=new URL(request.url),now=new Date(),from=new Date(u.searchParams.get("from")||now.toLocaleDateString("en-CA",{timeZone:"Asia/Tashkent"})),to=new Date(u.searchParams.get("to")||now.toLocaleDateString("en-CA",{timeZone:"Asia/Tashkent"}));from.setHours(0,0,0,0);to.setHours(23,59,59,999);return {u,from,to};}
export async function GET(request:Request){const s=await getSession();if(!s||!can(s.role,"sale:cancel"))return NextResponse.json({error:"Ruxsat yo‘q"},{status:403});try{const {u,from,to}=dates(request),id=Number(u.searchParams.get("id")||0);const items=await listCancellableSales({from,to,search:u.searchParams.get("q")||undefined,id:id||undefined});return NextResponse.json({items});}catch(error){console.error(error);return NextResponse.json({error:"Savdolarni olishda xato"},{status:500});}}
const input=z.object({saleId:z.coerce.number().int().positive(),reason:z.enum(["Test savdo","Xato sotuv","Mijoz qaytardi","Boshqa"]).optional()});
export async function POST(request:Request){const s=await getSession();if(!s||!can(s.role,"sale:cancel"))return NextResponse.json({error:"Ruxsat yo‘q"},{status:403});try{const data=input.parse(await request.json()),result=await cancelSale({...data,actor:{id:s.userId,role:s.role}});return NextResponse.json({ok:true,...result});}catch(error){console.error(error);return NextResponse.json({error:error instanceof z.ZodError?"Ma’lumotlarni tekshiring":error instanceof Error?error.message:"Savdoni bekor qilishda xato"},{status:400});}}
