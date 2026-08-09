"use client";
import {useState} from "react";
import {Smartphone} from "./icons";
import {suggestedPrice} from "@/lib/money";
type Category="SMARTPHONE"|"FEATURE_PHONE";

async function compressImage(file:File){
 if(file.size>10_000_000)throw new Error("Rasm hajmi 10 MB dan oshmasin");
 const source=await createImageBitmap(file);const max=900;const scale=Math.min(1,max/Math.max(source.width,source.height));
 const canvas=document.createElement("canvas");canvas.width=Math.round(source.width*scale);canvas.height=Math.round(source.height*scale);
 canvas.getContext("2d")?.drawImage(source,0,0,canvas.width,canvas.height);source.close();
 const result=canvas.toDataURL("image/webp",.72);if(result.length>650_000)throw new Error("Rasm siqilgandan keyin ham juda katta. Boshqa rasm tanlang");return result;
}

export function PurchaseForm(){
 const [category,setCategory]=useState<Category>("SMARTPHONE");const [cost,setCost]=useState(0);const [busy,setBusy]=useState(false);const [message,setMessage]=useState<{ok:boolean;text:string}|null>(null);const [file,setFile]=useState<File|null>(null);const [preview,setPreview]=useState("");
 function chooseImage(event:React.ChangeEvent<HTMLInputElement>){const selected=event.target.files?.[0]??null;setFile(selected);if(preview.startsWith("blob:"))URL.revokeObjectURL(preview);setPreview(selected?URL.createObjectURL(selected):"");}
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setMessage(null);try{const form=new FormData(event.currentTarget);const body=Object.fromEntries(form);const imageUrl=file?await compressImage(file):String(form.get("imageUrl")??"");const response=await fetch("/api/purchases",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,imageUrl,category,isPublished:form.get("isPublished")==="on"})});const data=await response.json();setMessage({ok:response.ok,text:response.ok?`Telefon omborga qo‘shildi (${data.quantity} dona)`:data.error});if(response.ok){event.currentTarget.reset();setFile(null);setPreview("");}}catch(error){setMessage({ok:false,text:error instanceof Error?error.message:"Rasmni tayyorlashda xato"});}finally{setBusy(false);}}
 return <><div className="choice-grid"><button type="button" className={category==="SMARTPHONE"?"selected":""} onClick={()=>setCategory("SMARTPHONE")}><i><Smartphone/></i><strong>Sensorli telefon</strong><span>IMEI bilan bittadan</span></button><button type="button" className={category==="FEATURE_PHONE"?"selected":""} onClick={()=>setCategory("FEATURE_PHONE")}><i className="feature-glyph">▦</i><strong>Tugmali telefon</strong><span>Miqdorli partiya</span></button></div><form className="form-card" onSubmit={submit}><h2>Telefon ma’lumotlari</h2>{message&&<div className={message.ok?"form-message success":"form-message error"}>{message.text}</div>}<div className="form-grid">
  <label>Brend<input name="brand" placeholder={category==="SMARTPHONE"?"Samsung, Apple":"Nokia"}/></label><label>Model *<input name="model" required placeholder="Galaxy A55"/></label>
  <label>Olingan narxi *<input name="purchasePrice" required inputMode="numeric" onChange={e=>setCost(Number(e.target.value))} placeholder="0"/></label><label>Sotish narxi *<input name="salePrice" required inputMode="numeric" placeholder="0"/><small>{cost>0&&<>Tavsiya: {suggestedPrice(cost,30).toLocaleString()} / {suggestedPrice(cost,40).toLocaleString()}</>}</small></label>
  <label>Qo‘shimcha xarajat<input name="extraCost" inputMode="numeric" defaultValue="0"/></label><label>Miqdor *<input name="quantity" required inputMode="numeric" defaultValue="1" readOnly={category==="SMARTPHONE"}/></label>
  {category==="SMARTPHONE"&&<><label>IMEI 1<input name="imei1" inputMode="numeric" pattern="\d{15}" maxLength={15} placeholder="15 raqam"/></label><label>IMEI 2<input name="imei2" inputMode="numeric" pattern="\d{15}" maxLength={15}/></label><label>Xotira<input name="storage" placeholder="128 GB"/></label><label>RAM<input name="ram" placeholder="8 GB"/></label><label>Rang<input name="color" placeholder="Qora"/></label><label>Holati<input name="condition" placeholder="Yangi"/></label></>}
  <label className="full image-upload"><span>Telefon rasmi</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage}/><small>Galereya yoki kameradan JPG, PNG, WebP tanlang (10 MB gacha)</small>{preview&&<img src={preview} alt="Tanlangan rasm"/>}</label>
  <label className="full">Yoki rasm URL<input name="imageUrl" type="url" placeholder="https://..." disabled={Boolean(file)}/></label>
  <label className="full">Tavsif<textarea name="description" placeholder="Telefon haqida public ma’lumot"/></label><label className="switch-label"><span>Saytda ko‘rsatish<small>Yoqilsa sayt va mijozlar Mini App katalogida darhol chiqadi</small></span><input name="isPublished" type="checkbox"/></label>
 </div><button disabled={busy} className="primary-button wide">{busy?"Rasm va telefon saqlanmoqda...":"Omborga qo‘shish"}</button></form></>;
}
