import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {formatMoney} from "@/lib/money";
import {getPublicProductDetail} from "@/services/public-catalog";

export const dynamic="force-dynamic";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params;const p=await getPublicProductDetail(slug);if(!p)return {title:"Telefon topilmadi"};
 const title=`${p.brand} ${p.model} sotib olish — TelMax`;
 const description=p.description||`${p.brand} ${p.model} ${p.storage||""} telefonini TelMax do‘konidan xarid qiling. Narxi, holati va ombordagi mavjudligi.`;
 return {title,description,alternates:{canonical:`/telefonlar/${p.slug}`},openGraph:{title,description,images:p.images[0]?.url?[p.images[0].url]:[]}};
}

function Spec({label,value}:{label:string;value:unknown}){if(value===null||value===undefined||value==="")return null;return <div className="product-spec"><span>{label}</span><strong>{String(value)}</strong></div>}

export default async function ProductPage({params}:{params:Promise<{slug:string}>}){
 const p=await getPublicProductDetail((await params).slug);if(!p)notFound();
 const firstImage=p.images[0]?.url;
 const telegram=(process.env.NEXT_PUBLIC_TELMAX_TELEGRAM||"Telmax_com").replace(/^@/,"");
 const phone=(process.env.NEXT_PUBLIC_TELMAX_PHONE||"").replace(/[^+\d]/g,"");
 const telegramUrl=`https://t.me/${telegram}`;
 const buyUrl=`https://t.me/${telegram}?text=${encodeURIComponent(`Assalomu alaykum, ${p.brand} ${p.model}${p.storage?` ${p.storage}`:""} telefoni bo‘yicha ma’lumot kerak.`)}`;
 const schema={"@context":"https://schema.org","@type":"Product",name:`${p.brand} ${p.model}`,description:p.description||undefined,image:p.images.map(x=>x.url),brand:{"@type":"Brand",name:p.brand},offers:{"@type":"Offer",priceCurrency:"UZS",price:p.price,availability:p.quantity>0?"https://schema.org/InStock":"https://schema.org/OutOfStock",url:`https://telmax.uz/telefonlar/${p.slug}`}};
 return <section className="product-detail-shell">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
  <div className="product-breadcrumb"><Link href="/telefonlar">Telefonlar</Link> / {p.brand} {p.model}</div>
  <div className="product-detail-modern">
   <div className="product-gallery">
    <div className="product-gallery-main">{firstImage?<img src={firstImage} alt={`${p.brand} ${p.model}`}/>:<span>TM</span>}</div>
    {p.images.length>1&&<div className="product-thumbs">{p.images.slice(1,5).map((image,i)=><img key={`${image.url}-${i}`} src={image.url} alt={image.alt||`${p.brand} ${p.model}`}/>)}</div>}
   </div>
   <div className="product-info-panel">
    <small>{p.category==="SMARTPHONE"?(p.platform==="IOS"?"IPHONE / IOS":"SENSORLI TELEFON"):"TUGMALI TELEFON"}</small>
    <h1>{p.brand} {p.model}</h1>
    <p className="product-description">{p.description||"TelMax do‘konidagi tekshirilgan va sotuvga tayyor telefon."}</p>
    <span className="product-stock-line">● Omborda {p.quantity} ta mavjud</span>
    <strong className="product-price">{formatMoney(p.price)}</strong>
    <div className="product-specs">
     <Spec label="Holati" value={p.condition}/><Spec label="Xotira" value={p.storage}/><Spec label="RAM" value={p.ram}/><Spec label="Rang" value={p.color}/>
     <Spec label="Kafolat" value={p.warrantyDays?`${p.warrantyDays} kun`:null}/><Spec label="Battery Health" value={p.batteryHealth}/><Spec label="Face ID" value={p.faceId}/><Spec label="True Tone" value={p.trueTone}/><Spec label="iCloud" value={p.icloud}/><Spec label="UZ IMEI" value={p.uzimei}/><Spec label="Ta’mir holati" value={p.repair}/><Spec label="Texnik holat" value={p.technicalState}/>
    </div>
    <div className="product-tech-note">Telefon bo‘yicha yakuniy mavjudlik, komplekt va yetkazib berish ma’lumotlarini sotib olishdan oldin TelMax bilan tasdiqlang.</div>
    <div className="product-actions"><a className="telegram-action" href={telegramUrl} target="_blank" rel="noreferrer">Telegram</a><a className="buy-action" href={buyUrl} target="_blank" rel="noreferrer">Sotib olish</a></div>
   </div>
  </div>
  <div className="mobile-buy-bar"><a className="call" href={phone?`tel:${phone}`:"/aloqa"}>Qo‘ng‘iroq</a><a className="telegram" href={telegramUrl} target="_blank" rel="noreferrer">Telegram</a><a className="buy" href={buyUrl} target="_blank" rel="noreferrer">Sotib olish</a></div>
 </section>;
}
