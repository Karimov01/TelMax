import {DeleteObjectCommand,PutObjectCommand,S3Client} from "@aws-sdk/client-s3";
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
function config(){const accountId=process.env.R2_ACCOUNT_ID,bucket=process.env.R2_BUCKET_NAME,accessKeyId=process.env.R2_ACCESS_KEY_ID,secretAccessKey=process.env.R2_SECRET_ACCESS_KEY,publicUrl=process.env.R2_PUBLIC_URL?.replace(/\/$/,"");if(!accountId||!bucket||!accessKeyId||!secretAccessKey||!publicUrl)throw new Error("R2 sozlamalari to‘liq emas");return {bucket,publicUrl,client:new S3Client({region:"auto",endpoint:`https://${accountId}.r2.cloudflarestorage.com`,credentials:{accessKeyId,secretAccessKey}})}}
export async function POST(request:Request){
 if(!await authorized())return NextResponse.json({error:"Ruxsat yo‘q"},{status:403});
 try{const form=await request.formData(),file=form.get("file");if(!(file instanceof File))return NextResponse.json({error:"Rasm tanlanmagan"},{status:400});
  if(file.size<1||file.size>10_000_000)return NextResponse.json({error:"Rasm hajmi 10 MB dan oshmasin"},{status:400});
  const ext=allowed.get(file.type);if(!ext)return NextResponse.json({error:"Faqat JPEG, PNG yoki WebP rasm qabul qilinadi"},{status:400});
  const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());if(!validSignature(bytes,file.type))return NextResponse.json({error:"Rasm fayli buzilgan yoki turi noto‘g‘ri"},{status:400});
  const {client,bucket,publicUrl}=config(),key=`phones/${crypto.randomUUID()}.${ext}`;await client.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:new Uint8Array(await file.arrayBuffer()),ContentType:file.type,CacheControl:"public, max-age=31536000, immutable"}));return NextResponse.json({url:`${publicUrl}/${key}`,pathname:key});
 }catch(error){console.error(error);return NextResponse.json({error:error instanceof Error&&error.message.includes("R2 sozlamalari")?error.message:"Rasmni Cloudflare R2’ga saqlashda xato"},{status:500});}
}
export async function DELETE(request:Request){if(!await authorized())return NextResponse.json({error:"Ruxsat yo‘q"},{status:403});try{const {url}=await request.json(),{client,bucket,publicUrl}=config();if(typeof url!=="string"||!url.startsWith(`${publicUrl}/`))return NextResponse.json({error:"Rasm manzili noto‘g‘ri"},{status:400});const key=decodeURIComponent(url.slice(publicUrl.length+1));if(!key.startsWith("phones/")||key.includes(".."))return NextResponse.json({error:"Rasm kaliti noto‘g‘ri"},{status:400});await client.send(new DeleteObjectCommand({Bucket:bucket,Key:key}));return NextResponse.json({ok:true});}catch{return NextResponse.json({error:"Rasmni o‘chirishda xato"},{status:400});}}
