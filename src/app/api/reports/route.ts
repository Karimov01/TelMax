import {NextResponse} from "next/server";
import {getSession} from "@/lib/session";
import {BUSINESS_TIME_ZONE} from "@/lib/constants";
import {reportBrands,reportConditions,reportFacets,reportHistory,reportSaleDetail,reportSummary,type ReportFilters} from "@/services/report-analytics";

export const runtime="nodejs";

function parseDate(value:string|null,end=false){
 const today=new Date().toLocaleDateString("en-CA",{timeZone:BUSINESS_TIME_ZONE});
 const source=value&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:today;
 const offset=BUSINESS_TIME_ZONE==="Asia/Tashkent"?"+05:00":"Z";
 return new Date(`${source}T${end?"23:59:59.999":"00:00:00"}${offset}`);
}
function filters(url:URL):ReportFilters{
 const category=url.searchParams.get("type");
 const payment=url.searchParams.get("payment");
 return {from:parseDate(url.searchParams.get("from")),to:parseDate(url.searchParams.get("to"),true),category:category==="SMARTPHONE"||category==="FEATURE_PHONE"?category:undefined,condition:url.searchParams.get("condition")||undefined,payment:["CASH","CARD","MIXED","TRANSFER","OTHER"].includes(payment||"")?payment as ReportFilters["payment"]:undefined,brand:url.searchParams.get("brand")||undefined};
}
export async function GET(request:Request){
 const session=await getSession();
 if(!session||!(["OWNER","ADMIN"] as string[]).includes(session.role))return NextResponse.json({error:"Ruxsat yo‘q"},{status:403});
 try{
  const url=new URL(request.url),view=url.searchParams.get("view")||"summary";
  if(view==="detail"){
   const id=Number(url.searchParams.get("id")||0);if(!id)return NextResponse.json({error:"Savdo topilmadi"},{status:400});
   return NextResponse.json({item:await reportSaleDetail(id)});
  }
  if(view==="facets")return NextResponse.json(await reportFacets());
  const f=filters(url);
  if(f.to.getTime()<f.from.getTime())return NextResponse.json({error:"Sana oralig‘i noto‘g‘ri"},{status:400});
  if(f.to.getTime()>Date.now()+86400000)return NextResponse.json({error:"Kelajakdagi sana tanlanmaydi"},{status:400});
  if(view==="brands")return NextResponse.json(await reportBrands(f));
  if(view==="conditions")return NextResponse.json(await reportConditions(f));
  if(view==="history")return NextResponse.json({items:await reportHistory(f)});
  return NextResponse.json(await reportSummary(f));
 }catch(error){console.error("Reports API failed",error);return NextResponse.json({error:"Hisobotni yuklab bo‘lmadi"},{status:500});}
}
