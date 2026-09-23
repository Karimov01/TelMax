import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {OptimizedImage} from "@/components/optimized-image";
import {getPublicProduct} from "@/services/catalog";
import {formatMoney} from "@/lib/money";

export const dynamic="force-dynamic";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params,p=await getPublicProduct(slug);
 if(!p)return {title:"Telefon topilmadi"};
 const title=`${p.brand} ${p.model} narxi`,description=p.description||`${p.brand} ${p.model} telefonini TelMax do‘konidan xarid qiling. Narxi va mavjudligi.`;
 return {title,description,alternates:{canonical:`/telefonlar/${p.slug}`},openGraph:{title,description,images:p.imageUrl?[p.imageUrl]:[]}};
}

export default async function ProductPage({params}:{params:Promise<{slug:string}>}){
 const p=await getPublicProduct((await params).slug);if(!p)notFound();
 const schema={"@context":"https://schema.org","@type":"Product",name:`${p.brand} ${p.model}`,description:p.description,image:p.imageUrl?[p.imageUrl]:undefined,offers:{"@type":"Offer",priceCurrency:"UZS",price:p.price,availability:p.quantity>0?"https://schema.org/InStock":"https://schema.org/OutOfStock"}};
 return <section className="product-page"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/><div className="product-detail-image">{p.imageUrl?<OptimizedImage src={p.imageUrl} alt={`${p.brand} ${p.model}`} width={640} height={640} sizes="(max-width: 720px) 90vw, 520px" eager/>:<span>TM</span>}</div><div><small>{p.category==="SMARTPHONE"?"SENSORLI TELEFON":"TUGMALI TELEFON"}</small><h1>{p.brand} {p.model}</h1><p>{p.description||"TelMax do‘konidagi tekshirilgan telefon."}</p><dl>{p.storage&&<><dt>Xotira</dt><dd>{p.storage}</dd></>}{p.ram&&<><dt>RAM</dt><dd>{p.ram}</dd></>}{p.color&&<><dt>Rang</dt><dd>{p.color}</dd></>}<dt>Mavjud</dt><dd>{p.quantity} ta</dd></dl><strong>{formatMoney(p.price)}</strong><a href="/aloqa" className="primary-button">Xarid uchun bog‘lanish</a></div></section>;
}
