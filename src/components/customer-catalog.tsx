import {listPublicProducts} from "@/services/catalog";
import {formatMoney} from "@/lib/money";
import {Smartphone} from "./icons";
import {TelegramProvider} from "./telegram-provider";
import {TmLogo} from "./tm-logo";

export async function CustomerCatalog({name}:{name:string}){
 const items=await listPublicProducts();
 return <div className="mini-app customer-app"><TelegramProvider/><main className="customer-catalog page-pad">
  <header className="app-header"><div className="brand-row"><TmLogo/><div><strong>Tel<span>Max</span></strong><small>Telefonlar katalogi</small></div></div><div className="customer-avatar">{name.slice(0,1).toUpperCase()}</div></header>
  <section className="customer-welcome"><small>XUSH KELIBSIZ</small><h1>{name}, telefoningizni tanlang</h1><p>Omborda mavjud telefonlar, narxlar va xususiyatlarni ko‘ring.</p></section>
  {items.length?<div className="customer-product-grid">{items.map(item=><article key={item.id}>
   <div className="customer-product-image">{item.imageUrl?<img src={item.imageUrl} alt={`${item.brand} ${item.model}`}/>:<Smartphone/>}</div>
   <div><small>{item.category==="SMARTPHONE"?"Sensorli":"Tugmali"}</small><h2>{item.brand} {item.model}</h2><p>{[item.storage,item.color].filter(Boolean).join(" • ")||"TelMax kafolati"}</p><strong>{formatMoney(item.price)}</strong><span>Omborda {item.quantity} ta</span></div>
  </article>)}</div>:<div className="empty large"><Smartphone/><strong>Hozircha telefonlar yo‘q</strong><span>Sotuvga chiqarilgan telefonlar shu yerda ko‘rinadi.</span></div>}
 </main></div>
}
