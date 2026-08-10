import {del, put} from "@vercel/blob";
import {NextResponse} from "next/server";
import {getSession} from "@/lib/session";
import {can} from "@/lib/permissions";

const allowed=new Map([["image/jpeg","jpg"],["image/png","png"],["image/webp","webp"]]);
function validSignature(bytes:Uint8Array,type:string){
 if(type==="image/jpeg")return bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
 if(type==="image/png")return bytes.slice(0,8).every((v,i)=>v===[137,80,78,71,13,10,26,10][i]);
 if(type==="image/webp")return new TextDecoder().decode(bytes.slice(0,4))==="RIFF"&&new TextDecoder().decode(bytes.slice(8,12))==="WEBP";
 return false;
}
async function authorized(){const s=await getSession();return Boolean(s&&can(s.role,"inventory:write"));}
export async function POST(request:Request){
 if(!await authorized())return NextResponse.json({error:"Ruxsat yo‘q"},{status:403});
 try{const form=await request.formData(),file=form.get("file");if(!(file instanceof File))return NextResponse.json({error:"Rasm tanlanmagan"},{status:400});
  if(file.size<1||file.size>10_000_000)return NextResponse.json({error:"Rasm hajmi 10 MB dan oshmasin"},{status:400});
  const ext=allowed.get(file.type);if(!ext)return NextResponse.json({error:"Faqat JPEG, PNG yoki WebP rasm qabul qilinadi"},{status:400});
  const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());if(!validSignature(bytes,file.type))return NextResponse.json({error:"Rasm fayli buzilgan yoki turi noto‘g‘ri"},{status:400});
  const blob=await put(`phones/${crypto.randomUUID()}.${ext}`,file,{access:"public",addRandomSuffix:false,contentType:file.type});return NextResponse.json({url:blob.url,pathname:blob.pathname});
 }catch(error){console.error(error);return NextResponse.json({error:"Rasmni saqlashda xato. Blob sozlamasini tekshiring"},{status:500});}
}
export async function DELETE(request:Request){if(!await authorized())return NextResponse.json({error:"Ruxsat yo‘q"},{status:403});try{const {url}=await request.json();if(typeof url!=="string"||!url.includes(".public.blob.vercel-storage.com/"))return NextResponse.json({error:"Rasm manzili noto‘g‘ri"},{status:400});await del(url);return NextResponse.json({ok:true});}catch{return NextResponse.json({error:"Rasmni o‘chirishda xato"},{status:400});}}
