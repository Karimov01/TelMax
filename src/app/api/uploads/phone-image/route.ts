import {DeleteObjectCommand,PutObjectCommand,S3Client} from "@aws-sdk/client-s3";
import {NextResponse} from "next/server";
import {getSession} from "@/lib/session";
import {can} from "@/lib/permissions";

export const runtime="nodejs";
export const maxDuration=30;

const allowed=new Map([["image/jpeg","jpg"],["image/png","png"],["image/webp","webp"]]);
function validSignature(bytes:Uint8Array,type:string){
 if(type==="image/jpeg")return bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
 if(type==="image/png")return bytes.slice(0,8).every((v,i)=>v===[137,80,78,71,13,10,26,10][i]);
 if(type==="image/webp")return new TextDecoder().decode(bytes.slice(0,4))==="RIFF"&&new TextDecoder().decode(bytes.slice(8,12))==="WEBP";
 return false;
}
async function authorized(){const s=await getSession();return Boolean(s&&can(s.role,"inventory:write"));}
function config(){
 const accountId=process.env.R2_ACCOUNT_ID,bucket=process.env.R2_BUCKET_NAME,accessKeyId=process.env.R2_ACCESS_KEY_ID,secretAccessKey=process.env.R2_SECRET_ACCESS_KEY,publicUrl=process.env.R2_PUBLIC_URL?.replace(/\/$/,"");
 const missing=[!accountId&&"R2_ACCOUNT_ID",!bucket&&"R2_BUCKET_NAME",!accessKeyId&&"R2_ACCESS_KEY_ID",!secretAccessKey&&"R2_SECRET_ACCESS_KEY",!publicUrl&&"R2_PUBLIC_URL"].filter(Boolean);
 if(missing.length)throw new Error(`R2 sozlamalari to‘liq emas: ${missing.join(", ")}`);
 return {bucket:bucket!,publicUrl:publicUrl!,client:new S3Client({region:"auto",endpoint:`https://${accountId}.r2.cloudflarestorage.com`,credentials:{accessKeyId:accessKeyId!,secretAccessKey:secretAccessKey!}})};
}
export async function POST(request:Request){
 if(!await authorized())return NextResponse.json({error:"Ruxsat yo‘q"},{status:403});
 try{
  const form=await request.formData(),file=form.get("file");if(!(file instanceof File))return NextResponse.json({error:"Rasm tanlanmagan"},{status:400});
  if(file.size<1||file.size>10_000_000)return NextResponse.json({error:"Rasm hajmi 10 MB dan oshmasin"},{status:400});
  const ext=allowed.get(file.type);if(!ext)return NextResponse.json({error:"Faqat JPEG, PNG yoki WebP rasm qabul qilinadi"},{status:400});
  const signature=new Uint8Array(await file.slice(0,16).arrayBuffer());if(!validSignature(signature,file.type))return NextResponse.json({error:"Rasm fayli buzilgan yoki turi noto‘g‘ri"},{status:400});
  const {client,bucket,publicUrl}=config(),key=`phones/${crypto.randomUUID()}.${ext}`;
  const body=new Uint8Array(await file.arrayBuffer());
  await client.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:body,ContentType:file.type,CacheControl:"public, max-age=31536000, immutable"}));
  return NextResponse.json({ok:true,url:`${publicUrl}/${key}`,pathname:key});
 }catch(error){
  console.error("Phone image upload failed",error);
  const message=error instanceof Error&&error.message.startsWith("R2 sozlamalari")?error.message:"Rasmni saqlashda xato. Qayta urinib ko‘ring.";
  return NextResponse.json({error:message},{status:500});
 }
}
export async function DELETE(request:Request){
 if(!await authorized())return NextResponse.json({error:"Ruxsat yo‘q"},{status:403});
 try{
  const {url}=await request.json(),{client,bucket,publicUrl}=config();if(typeof url!=="string"||!url.startsWith(`${publicUrl}/`))return NextResponse.json({error:"Rasm manzili noto‘g‘ri"},{status:400});
  const key=decodeURIComponent(url.slice(publicUrl.length+1));if(!key.startsWith("phones/")||key.includes(".."))return NextResponse.json({error:"Rasm kaliti noto‘g‘ri"},{status:400});
  await client.send(new DeleteObjectCommand({Bucket:bucket,Key:key}));return NextResponse.json({ok:true});
 }catch(error){console.error("Phone image delete failed",error);return NextResponse.json({error:"Rasmni o‘chirishda xato"},{status:400});}
}
