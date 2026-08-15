"use client";

import Link from "next/link";
import {useMemo,useState} from "react";
import {formatMoney} from "@/lib/money";
import {Smartphone} from "./icons";

type Item={id:number;slug:string;category:"SMARTPHONE"|"FEATURE_PHONE";platform:"ANDROID"|"IOS"|"FEATURE"|null;brand:string;model:string;description:string|null;storage:string|null;ram:string|null;color:string|null;condition:string|null;price:number;warrantyDays:number;quantity:number;imageUrl:string|null};
type Facets={brands:string[];storages:string[];colors:string[];conditions:string[]};

export function PublicCatalogClient({items,facets,category}:{items:Item[];facets:Facets;category?:"SMARTPHONE"|"FEATURE_PHONE"}){
 const [q,setQ]=useState("");const [brand,setBrand]=useState("");const [platform,setPlatform]=useState("");const [condition,setCondition]=useState("");const [storage,setStorage]=useState("");const [color,setColor]=useState("");const [sort,setSort]=useState("newest");const [filtersOpen,setFiltersOpen]=useState(false);
 const normalized=q.trim().toLocaleLowerCase("uz");
 const filtered=useMemo(()=>{
  const result=items.filter(item=>{
   const hay=[item.brand,item.model,item.storage,item.ram,item.color,item.condition,item.platform].filter(Boolean).join(" ").toLocaleLowerCase("uz");
   return (!normalized||hay.includes(normalized)||normalized.split(/\s+/).every(part=>hay.includes(part)))&&(!brand||item.brand===brand)&&(!platform||item.platform===platform)&&(!condition||item.condition===condition)&&(!storage||item.storage===storage)&&(!color||item.color===color);
  });
  return [...result].sort((a,b)=>sort==="price_asc"?a.price-b.price:sort==="price_desc"?b.price-a.price:sort==="name_asc"?`${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`):b.id-a.id);
 },[items,normalized,brand,platform,condition,storage,color,sort]);
 const active=[brand,platform,condition,storage,color].filter(Boolean).length;
 const reset=()=>{setBrand("");setPlatform("");setCondition("");setStorage("");setColor("");setSort("newest")};
 return <>
  <div className="catalog-search-panel">
   <div className="catalog-search"><span>⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Masalan: iPhone 15 Pro 256, A13 128..." aria-label="Telefon qidirish"/>{q&&<button onClick={()=>setQ("")} aria-label="Qidiruvni tozalash">×</button>}</div>
   <div className="catalog-toolbar"><button className="catalog-filter-toggle" onClick={()=>setFiltersOpen(v=>!v)}>Filtrlar{active?` (${active})`:""}</button><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Saralash"><option value="newest">Yangi qo‘shilgan</option><option value="price_asc">Arzon → qimmat</option><option value="price_desc">Qimmat → arzon</option><option value="name_asc">Nomi bo‘yicha</option></select></div>
   <div className={`catalog-filters ${filtersOpen?"open":""}`}>
    {!category&&<select value={platform} onChange={e=>setPlatform(e.target.value)}><option value="">Barcha turlar</option><option value="IOS">iPhone / iOS</option><option value="ANDROID">Android</option><option value="FEATURE">Tugmali</option></select>}
    <select value={brand} onChange={e=>setBrand(e.target.value)}><option value="">Barcha brendlar</option>{facets.brands.map(x=><option key={x}>{x}</option>)}</select>
    <select value={condition} onChange={e=>setCondition(e.target.value)}><option value="">Holati</option>{facets.conditions.map(x=><option key={x}>{x}</option>)}</select>
    <select value={storage} onChange={e=>setStorage(e.target.value)}><option value="">Xotira</option>{facets.storages.map(x=><option key={x}>{x}</option>)}</select>
    <select value={color} onChange={e=>setColor(e.target.value)}><option value="">Rang</option>{facets.colors.map(x=><option key={x}>{x}</option>)}</select>
    {active>0&&<button className="catalog-reset" onClick={reset}>Tozalash</button>}
   </div>
  </div>
  <div className="catalog-result-row"><strong>{filtered.length} ta telefon</strong>{normalized&&<span>“{q.trim()}” bo‘yicha natija</span>}</div>
  {filtered.length?<div className="public-product-grid">{filtered.map(item=><Link href={`/telefonlar/${item.slug}`} key={item.id} className="catalog-card">
   <div className="product-image">{item.imageUrl?<img src={item.imageUrl} alt={`${item.brand} ${item.model}`}/>:<Smartphone/>}<span className="stock-badge">{item.quantity} ta bor</span></div>
   <div className="catalog-card-body"><small>{item.category==="SMARTPHONE"?(item.platform==="IOS"?"iPhone":"Sensorli"):"Tugmali"}</small><h2>{item.brand} {item.model}</h2><p>{[item.storage,item.ram,item.color].filter(Boolean).join(" • ")||"TelMax kafolati"}</p><div className="catalog-price-row"><strong>{formatMoney(item.price)}</strong><span>Ko‘rish →</span></div></div>
  </Link>)}</div>:<div className="empty catalog-empty"><Smartphone/><strong>Telefon topilmadi</strong><span>Qidiruv yoki filtrlarni o‘zgartirib ko‘ring.</span><button className="secondary-button" onClick={()=>{setQ("");reset()}}>Barchasini ko‘rsatish</button></div>}
 </>
}
