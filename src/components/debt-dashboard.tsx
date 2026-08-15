"use client";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import {CalendarDays,ChevronRight,Search,User} from "@/components/icons";
import {formatMoney} from "@/lib/money";

type Filter="all"|"active"|"overdue"|"soon"|"paid";
type Debt={id:number;remainingAmount:number;dueDate:string;status:string;customerName:string|null;customerPhone:string|null;brand:string|null;model:string|null;storage:string|null;color:string|null;imageUrl:string|null};
type Data={today:string;summary:{total:number;active:number;overdue:number;dueToday:number};rows:Debt[]};
const filters:[Filter,string][]=[["all","Barchasi"],["active","Joriy"],["overdue","Muddati o‘tgan"],["soon","Yaqin"],["paid","To‘langan"]];
function days(today:string,due:string){return Math.round((new Date(`${due}T12:00:00Z`).getTime()-new Date(`${today}T12:00:00Z`).getTime())/86400000)}
function badge(d:Debt,today:string){if(d.status==="PAID")return {text:"To‘langan",kind:"paid"};const left=days(today,d.dueDate);if(left<0)return {text:`${Math.abs(left)} kun o‘tgan`,kind:"late"};if(left<=3)return {text:left===0?"Bugun":`${left} kun qoldi`,kind:"soon"};return {text:"Joriy",kind:"active"}}

export function DebtDashboard(){
 const [data,setData]=useState<Data|null>(null),[filter,setFilter]=useState<Filter>("all"),[q,setQ]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch(`/api/debts?filter=${filter}&q=${encodeURIComponent(q)}`,{cache:"no-store"}),j=await r.json();if(!r.ok)throw new Error(j.error);setData(j)}catch(e){setError(e instanceof Error?e.message:"Yuklashda xato")}finally{setLoading(false)}},[filter,q]);
 useEffect(()=>{const t=setTimeout(load,180);return()=>clearTimeout(t)},[load]);
 return <div className="debt-page">
  <header className="debt-brand"><div className="profile-brand-mark">TM</div><div><b>Tel<span>Max</span></b><small>Telefon Do‘koni</small></div></header>
  <div className="debt-title-row"><div><h1>Qarzdorlar</h1><p>Faol qarzlar va to‘lov muddatlari</p></div><Link href="/app/sotish?new=1&debt=1" className="debt-add">＋</Link></div>
  <div className="debt-search"><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Ism, telefon yoki model..."/></div>
  {data&&<section className="debt-kpis"><article><span>Jami qarz</span><b>{formatMoney(data.summary.total)}</b></article><article className="warn"><span>Muddati o‘tgan</span><b>{data.summary.overdue} ta</b></article><article className="good"><span>Bugun tushishi kerak</span><b>{formatMoney(data.summary.dueToday)}</b></article><article><span>Qarzdorlar</span><b>{data.summary.active} ta</b></article></section>}
  <div className="debt-filters">{filters.map(([v,label])=><button key={v} onClick={()=>setFilter(v)} className={filter===v?"active":""}>{label}</button>)}</div>
  {error?<div className="debt-empty"><strong>{error}</strong><button onClick={load}>Qayta urinish</button></div>:loading&&!data?<div className="debt-skeleton">{[1,2,3].map(x=><i key={x}/>)}</div>:<section className="debt-list">{data?.rows.length?data.rows.map(d=>{const b=badge(d,data.today);return <Link href={`/app/qarzdorlar/${d.id}`} key={d.id} className="debt-card">{d.imageUrl?<img src={d.imageUrl} alt=""/>:<div className="debt-avatar"><User/></div>}<div className="debt-main"><div><strong>{d.customerName||"Nomsiz mijoz"}</strong><b>{formatMoney(d.remainingAmount)}</b></div><small>{[d.brand,d.model,d.storage,d.color].filter(Boolean).join(" • ")||d.customerPhone||"Telefon ma’lumoti yo‘q"}</small><footer><span><CalendarDays/> {d.dueDate}</span><em className={b.kind}>{b.text}</em></footer></div><ChevronRight/></Link>}):<div className="debt-empty"><strong>Hozircha qarz yo‘q</strong><span>Qarzli sotuvlar shu yerda ko‘rinadi.</span></div>}</section>}
 </div>
}
