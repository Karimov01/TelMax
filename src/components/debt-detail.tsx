"use client";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import {CalendarDays,User} from "@/components/icons";
import {formatMoney} from "@/lib/money";

type Payment={id:number;amount:number;cashAmount:number;cardAmount:number;notes:string|null;paidAt:string;status:string;receiver:string|null};
type Detail={id:number;saleId:number;totalAmount:number;paidAmount:number;remainingAmount:number;dueDate:string;status:string;customerName:string|null;customerPhone:string|null;saleNumber:string;soldAt:string;notes:string|null;seller:string|null;subtotal:number;brand:string;model:string;storage:string|null;color:string|null;category:string;platform:string|null;imageUrl:string|null;payments:Payment[]};
type Method="CASH"|"CARD"|"TRANSFER"|"OTHER";
const methods:[Method,string][]=[["CASH","Naqd pul"],["CARD","Bank kartasi"],["TRANSFER","Pul o‘tkazish"],["OTHER","Boshqa"]];
function paymentMethod(p:Payment){const m=p.notes?.match(/^\[(CASH|CARD|TRANSFER|OTHER)\]/)?.[1];return m==="CARD"?"Bank kartasi":m==="TRANSFER"?"Pul o‘tkazish":m==="OTHER"?"Boshqa":p.cardAmount?"Bank kartasi":"Naqd pul"}

export function DebtDetail({id}:{id:number}){
 const [data,setData]=useState<Detail|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[payOpen,setPayOpen]=useState(false),[amount,setAmount]=useState(0),[method,setMethod]=useState<Method>("CASH"),[notes,setNotes]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const load=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch(`/api/debts?id=${id}`,{cache:"no-store"}),j=await r.json();if(!r.ok)throw new Error(j.error);setData(j);setAmount(j.remainingAmount)}catch(e){setError(e instanceof Error?e.message:"Yuklashda xato")}finally{setLoading(false)}},[id]);
 useEffect(()=>{load()},[load]);
 async function pay(){if(!data||busy)return;setBusy(true);setMessage("");try{const r=await fetch("/api/debts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({debtId:data.id,amount,method,notes})}),j=await r.json();if(!r.ok)throw new Error(j.error);setMessage(j.remainingAmount===0?"Qarz to‘liq yopildi":"To‘lov qabul qilindi");setPayOpen(false);setNotes("");await load()}catch(e){setMessage(e instanceof Error?e.message:"To‘lovda xato")}finally{setBusy(false)}}
 if(loading&&!data)return <div className="debt-page"><div className="debt-skeleton"><i/><i/><i/></div></div>;
 if(error||!data)return <div className="debt-page"><div className="debt-empty"><strong>{error||"Qarz topilmadi"}</strong><button onClick={load}>Qayta urinish</button></div></div>;
 return <div className="debt-page debt-detail-page">
  <header className="debt-inner-head"><Link href="/app/qarzdorlar">‹</Link><h1>Qarzdor tafsiloti</h1><span/></header>
  {message&&<p className="debt-message">{message}</p>}
  <section className="debtor-card"><div className="debt-avatar large"><User/></div><div><strong>{data.customerName||"Nomsiz mijoz"}</strong>{data.customerPhone&&<a href={`tel:${data.customerPhone}`}>{data.customerPhone}</a>}</div>{data.customerPhone&&<a className="call-button" href={`tel:${data.customerPhone}`}>☎</a>}</section>
  <section className="debt-balance"><div><span>Qolgan qarz</span><strong>{formatMoney(data.remainingAmount)}</strong></div><em className={data.status==="PAID"?"paid":"late"}>{data.status==="PAID"?"To‘langan":new Date(`${data.dueDate}T23:59:59`).getTime()<Date.now()?"Muddati o‘tgan":"Joriy"}</em><dl><dt>Jami qarz</dt><dd>{formatMoney(data.totalAmount)}</dd><dt>To‘langan</dt><dd>{formatMoney(data.paidAmount)}</dd><dt>To‘lov muddati</dt><dd>{data.dueDate}</dd><dt>Sotuv raqami</dt><dd>{data.saleNumber}</dd></dl>{data.status==="ACTIVE"&&<button onClick={()=>{setAmount(data.remainingAmount);setPayOpen(true)}} className="debt-pay-button">＋ To‘lov qo‘shish</button>}</section>
  <section className="debt-product">{data.imageUrl?<img src={data.imageUrl} alt=""/>:<div className="debt-avatar"><User/></div>}<div><small>Qarzga olingan telefon</small><strong>{data.brand} {data.model}</strong><span>{[data.storage,data.color,data.platform].filter(Boolean).join(" • ")}</span></div></section>
  <section className="debt-section"><h2>To‘lovlar tarixi</h2>{data.payments.length?data.payments.map(p=><article className="debt-payment-row" key={p.id}><div><strong>{formatMoney(p.amount)}</strong><span>{paymentMethod(p)} • {new Date(p.paidAt).toLocaleString("uz-UZ")}</span></div><small>{p.receiver||"Admin"}</small></article>):<div className="debt-empty compact">Hozircha to‘lov yo‘q</div>}</section>
  {(data.notes||data.seller)&&<section className="debt-section"><h2>Qo‘shimcha ma’lumot</h2>{data.seller&&<p><span>Sotuvchi</span><b>{data.seller}</b></p>}{data.notes&&<p><span>Izoh</span><b>{data.notes}</b></p>}</section>}
  {payOpen&&<div className="debt-sheet-backdrop" onClick={()=>!busy&&setPayOpen(false)}><section className="debt-sheet" onClick={e=>e.stopPropagation()}><header><div><h2>Yangi to‘lov</h2><p>Qoldiq: {formatMoney(data.remainingAmount)}</p></div><button onClick={()=>setPayOpen(false)}>×</button></header><label>To‘lov summasi<input inputMode="numeric" value={amount||""} onChange={e=>setAmount(Number(e.target.value.replace(/\D/g,"")))}/></label><div className="debt-quick"><button onClick={()=>setAmount(Math.round(data.remainingAmount/2))}>50%</button><button onClick={()=>setAmount(data.remainingAmount)}>To‘liq</button></div><label>To‘lov usuli</label><div className="debt-methods">{methods.map(([v,t])=><button className={method===v?"active":""} key={v} onClick={()=>setMethod(v)}>{t}</button>)}</div><label>Izoh (ixtiyoriy)<textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={500}/></label><button disabled={busy||amount<1||amount>data.remainingAmount} onClick={pay} className="debt-pay-button">{busy?"Saqlanmoqda...":"To‘lovni saqlash"}</button></section></div>}
 </div>
}
