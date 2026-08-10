import Link from "next/link";
import {CircleDollarSign, PackagePlus, ShoppingBag} from "./icons";
import {TmLogo} from "./tm-logo";
import {formatMoney} from "@/lib/money";
import type {SalesDashboardData} from "@/services/sales-dashboard";

export function SalesDashboard({data}:{data:SalesDashboardData}){
 return <div className="sales-dashboard page-pad">
  <header className="app-header"><div className="brand-row"><TmLogo/><div><strong>Tel<span>Max</span></strong><small>Telefon Do‘koni</small></div></div><button className="avatar" aria-label="Profil">TM<i/></button></header>
  <h1>Savdo</h1>
  <section className="sales-stat-grid">
   <article><ShoppingBag/><span>Bugun<strong>{data.todayCount} ta</strong></span></article>
   <article><CircleDollarSign/><span>Bugun summa<strong>{formatMoney(data.todayRevenue)}</strong></span></article>
   <article><span className="stat-symbol">↗</span><span>Bugun foyda<strong>{formatMoney(data.todayProfit)}</strong></span></article>
   <article><span className="stat-symbol purple">◔</span><span>Umumiy foyda<strong>{formatMoney(data.totalProfit)}</strong></span></article>
  </section>
  <Link className="new-sale-button" href="/app/sotish?new=1">＋ Yangi sotuv</Link>
  <div className="sales-shortcuts"><Link href="/app/sotib-olish"><PackagePlus/>Kirim (telefon olish)</Link><Link href="/app/hisobot">▣ Savdo statistikasi</Link></div>
  <section className="recent-sales"><div className="section-title"><h2>So‘nggi sotuvlar</h2><Link href="/app/tarix">Barchasi ›</Link></div>
   <div className="sales-list">{data.recent.length?data.recent.map(s=><Link href={`/app/tarix/${s.id}`} key={s.id}>{s.imageUrl?<img className="sale-thumb" src={s.imageUrl} alt=""/>:<span className="sale-icon">{s.category==="SMARTPHONE"?"▯":"▦"}</span>}<span><strong>{s.brand} {s.model}</strong><small>{s.category==="FEATURE_PHONE"?"Tugmali":s.storage}{s.color?` • ${s.color}`:""}</small><small>{s.quantity} dona • {formatMoney(s.total)}</small></span><span className="sale-money"><small>{new Intl.DateTimeFormat("uz-UZ",{timeZone:"Asia/Tashkent",hour:"2-digit",minute:"2-digit"}).format(s.soldAt)}</small><em>+{formatMoney(s.profit)}</em></span></Link>):<div className="empty"><ShoppingBag/><strong>Hali sotuv yo‘q</strong><span>Birinchi sotuv shu yerda ko‘rinadi.</span></div>}</div>
  </section>
 </div>;
}
