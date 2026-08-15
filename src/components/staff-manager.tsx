"use client";
import {useCallback,useEffect,useState} from "react";

type Staff={id:number;telegramId:number;firstName:string;lastName:string|null;username:string|null;role:string;active:boolean;createdAt:string};

export function StaffManager(){
 const [items,setItems]=useState<Staff[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const load=useCallback(async()=>{setLoading(true);try{const r=await fetch("/api/staff",{cache:"no-store"}),d=await r.json();if(!r.ok)throw new Error(d.error||"Xodimlar yuklanmadi");setItems(d.items||[])}catch(e){setMessage(e instanceof Error?e.message:"Xato")}finally{setLoading(false)}},[]);
 useEffect(()=>{load()},[load]);
 async function add(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(busy)return;setBusy(true);setMessage("");const form=e.currentTarget,f=new FormData(form);try{const r=await fetch("/api/staff",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({telegramId:Number(f.get("telegramId")),name:String(f.get("name")||"")})}),d=await r.json();if(!r.ok)throw new Error(d.error||"Sotuvchi qo‘shilmadi");form.reset();setMessage("Sotuvchi qo‘shildi");await load()}catch(e){setMessage(e instanceof Error?e.message:"Xato")}finally{setBusy(false)}}
 async function toggle(item:Staff){setMessage("");try{const r=await fetch("/api/staff",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id:item.id,active:!item.active})}),d=await r.json();if(!r.ok)throw new Error(d.error||"Holat o‘zgarmadi");await load()}catch(e){setMessage(e instanceof Error?e.message:"Xato")}}
 return <div className="staff-manager">
  <section className="staff-intro"><h1>Sotuvchilar</h1><p>Telegram orqali kiradigan yordamchi sotuvchilarni boshqaring.</p></section>
  <form className="staff-add-card" onSubmit={add}>
   <h2>+ Yangi sotuvchi</h2>
   <label>Ismi<input name="name" required minLength={2} maxLength={120} placeholder="Masalan: Ali"/></label>
   <label>Telegram ID<input name="telegramId" required inputMode="numeric" pattern="[0-9]+" placeholder="123456789"/></label>
   <small>Telegram ID ni @userinfobot kabi bot orqali bilish mumkin. Sotuvchi keyin TelMax Mini App’ga o‘z Telegramidan kiradi.</small>
   <button className="primary-button wide" disabled={busy}>{busy?"Saqlanmoqda...":"Sotuvchini qo‘shish"}</button>
  </form>
  {message&&<p className="form-message">{message}</p>}
  <section className="staff-permissions"><h2>Sotuvchi huquqlari</h2><div><span>✓ Telefon sotish</span><span>✓ Telefon qo‘shish</span><span>✓ Omborni ko‘rish</span><span>✕ Hisobotlar</span><span>✕ Savdoni bekor qilish</span><span>✕ Xodim boshqarish</span></div></section>
  <section className="staff-list"><h2>Faol xodimlar</h2>{loading?<div className="empty">Yuklanmoqda…</div>:items.length?items.map(item=><article key={item.id}><div className="staff-avatar">{item.firstName.charAt(0).toUpperCase()}</div><div><strong>{[item.firstName,item.lastName].filter(Boolean).join(" ")}</strong><small>{item.username?`@${item.username}`:`Telegram ID: ${item.telegramId}`}</small><em className={item.active?"active":"inactive"}>{item.active?"Faol":"Faolsiz"}</em></div><button type="button" onClick={()=>toggle(item)}>{item.active?"Faolsizlantirish":"Faollashtirish"}</button></article>):<div className="empty"><strong>Hozircha sotuvchi yo‘q</strong><span>Yuqoridagi forma orqali birinchi sotuvchini qo‘shing.</span></div>}</section>
 </div>;
}
