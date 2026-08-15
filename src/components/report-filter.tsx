"use client";
import {useEffect,useState} from "react";
import {useRouter,useSearchParams} from "next/navigation";
import Link from "next/link";

type Facets={brands:string[]};
const Chip=({active,onClick,children}:{active:boolean;onClick:()=>void;children:React.ReactNode})=><button type="button" className={active?"active":""} onClick={onClick}>{children}</button>;
export function ReportFilter(){
 const router=useRouter(),sp=useSearchParams();
 const [type,setType]=useState(sp.get("type")||""),[condition,setCondition]=useState(sp.get("condition")||""),[payment,setPayment]=useState(sp.get("payment")||""),[brand,setBrand]=useState(sp.get("brand")||""),[facets,setFacets]=useState<Facets>({brands:[]});
 useEffect(()=>{fetch("/api/reports?view=facets",{cache:"no-store"}).then(r=>r.ok?r.json():{brands:[]}).then(setFacets).catch(()=>setFacets({brands:[]}))},[]);
 const reset=()=>{setType("");setCondition("");setPayment("");setBrand("")};
 const apply=()=>{const q=new URLSearchParams(sp.toString());for(const key of ["type","condition","payment","brand"])q.delete(key);if(type)q.set("type",type);if(condition)q.set("condition",condition);if(payment)q.set("payment",payment);if(brand)q.set("brand",brand);router.push(`/app/hisobot/tarix?${q}`)};
 return <div className="tm-report tm-filter-page"><div className="tm-filter-head"><Link href="/app/hisobot/tarix">←</Link><h1>Filter</h1><button onClick={reset}>Tozalash</button></div>
  <section><h2>Telefon turi</h2><div className="tm-filter-chips"><Chip active={!type} onClick={()=>setType("")}>Barchasi</Chip><Chip active={type==="SMARTPHONE"} onClick={()=>setType("SMARTPHONE")}>Sensorli</Chip><Chip active={type==="FEATURE_PHONE"} onClick={()=>setType("FEATURE_PHONE")}>Tugmali</Chip></div></section>
  <section><h2>Holati</h2><div className="tm-filter-chips"><Chip active={!condition} onClick={()=>setCondition("")}>Barchasi</Chip><Chip active={condition==="Yangi"} onClick={()=>setCondition("Yangi")}>Yangi</Chip><Chip active={condition==="Ishlatilgan"} onClick={()=>setCondition("Ishlatilgan")}>Ishlatilgan</Chip></div></section>
  <section><h2>To‘lov usuli</h2><div className="tm-filter-chips wrap"><Chip active={!payment} onClick={()=>setPayment("")}>Barchasi</Chip><Chip active={payment==="CASH"} onClick={()=>setPayment("CASH")}>Naqd pul</Chip><Chip active={payment==="CARD"} onClick={()=>setPayment("CARD")}>Bank kartasi</Chip><Chip active={payment==="TRANSFER"} onClick={()=>setPayment("TRANSFER")}>Pul o‘tkazish</Chip><Chip active={payment==="OTHER"} onClick={()=>setPayment("OTHER")}>Boshqa</Chip></div></section>
  <section><h2>Brend</h2><select value={brand} onChange={e=>setBrand(e.target.value)}><option value="">Barchasi</option>{facets.brands.map(x=><option key={x} value={x}>{x}</option>)}</select></section>
  <button className="tm-apply-filter" onClick={apply}>Qo‘llash</button>
 </div>
}
