import Link from "next/link";
import {eq} from "drizzle-orm";
import {getSession} from "@/lib/session";
import {can} from "@/lib/permissions";
import {getDb} from "@/db/client";
import {users} from "@/db/schema";
import {Building2,ChevronRight,CreditCard,HandCoins,PackagePlus,RotateCcw,Settings,ShoppingCart,Undo2,User,WalletCards,Box} from "@/components/icons";

type MenuItem={path:string;title:string;text:string;Icon:React.ComponentType<{className?:string}>;danger?:boolean};

const finance:MenuItem[]=[
 {path:"investitsiya",title:"Investitsiya",text:"Sarmoya va real kapital",Icon:WalletCards},
 {path:"qarzdorlar",title:"Qarzdorlar",text:"Qarzlar va muddatlar",Icon:CreditCard},
 {path:"tolov",title:"To‘lov qabul qilish",text:"Qarz to‘lovlari",Icon:HandCoins},
 {path:"bolib-tolash",title:"Bo‘lib to‘lash",text:"Hamkorlar hisoboti",Icon:Building2},
];
const operations:MenuItem[]=[{path:"qaytarish",title:"Qaytarish",text:"Qaytgan telefonlar",Icon:RotateCcw}];
const sellerTools:MenuItem[]=[
 {path:"sotish?new=1",title:"Telefon sotish",text:"Yangi savdo qilish",Icon:ShoppingCart},
 {path:"sotib-olish",title:"Telefon qo‘shish",text:"Omborga yangi telefon kiritish",Icon:PackagePlus},
 {path:"ombor",title:"Ombor",text:"Mavjud telefonlarni ko‘rish",Icon:Box},
];

function MenuSection({title,items}:{title:string;items:MenuItem[]}){if(!items.length)return null;return <section className="profile-section"><h2>{title}</h2><div className="profile-menu">{items.map(({path,title,text,Icon,danger})=><Link href={`/app/${path}`} key={path} className={danger?"danger":""}><i><Icon/></i><span><strong>{title}</strong><small>{text}</small></span><ChevronRight/></Link>)}</div></section>}
function roleLabel(role:string){return role==="OWNER"?"Egasi":role==="ADMIN"?"Admin":role==="STAFF"?"Sotuvchi":"Foydalanuvchi"}

export default async function Management(){
 const session=process.env.NODE_ENV==="development"?{userId:1,telegramId:0,role:"OWNER" as const,name:"TelMax"}:await getSession();if(!session)return null;
 let profile:{firstName:string;lastName:string|null;username:string|null;telegramId:number}|null=null;
 try{const [row]=await getDb().select({firstName:users.firstName,lastName:users.lastName,username:users.username,telegramId:users.telegramId}).from(users).where(eq(users.id,session.userId)).limit(1);if(row)profile=row}catch(error){console.error("Profil ma’lumotlarini olishda xato",error)}
 const fullName=profile?[profile.firstName,profile.lastName].filter(Boolean).join(" "):session.name,initial=(fullName||"T").trim().charAt(0).toUpperCase();
 const management=can(session.role,"report:read"),ops=management?[...operations,...(can(session.role,"sale:cancel")?[{path:"savdoni-bekor-qilish",title:"Savdoni bekor qilish",text:"Xato savdoni omborga qaytarish",Icon:Undo2,danger:true} satisfies MenuItem]:[])]:[];
 const system:MenuItem[]=[...(can(session.role,"user:manage")?[{path:"xodimlar",title:"Xodimlar",text:"Sotuvchilarni qo‘shish va boshqarish",Icon:User} satisfies MenuItem]:[]),...(can(session.role,"settings:manage")?[{path:"sozlamalar",title:"Sozlamalar",text:"Do‘kon va bot sozlamalari",Icon:Settings} satisfies MenuItem]:[])];
 return <div className="profile-page">
  <header className="profile-brand"><div className="profile-brand-mark">TM</div><div><b>Tel<span>Max</span></b><small>Telefon Do‘koni</small></div></header><h1>Profil</h1>
  <section className="profile-card"><div className="profile-avatar">{initial}<i/></div><div className="profile-identity"><strong>{fullName||"TelMax"}</strong>{profile?.username&&<span>@{profile.username}</span>}<div><em>{roleLabel(session.role)}</em><small>Telegram orqali kirilgan</small></div></div><User className="profile-user-icon"/></section>
  <div className="profile-meta"><div><span>Rol</span><b>{roleLabel(session.role)}</b></div><div><span>Telegram ID</span><b>{profile?.telegramId||session.telegramId||"—"}</b></div></div>
  {session.role==="STAFF"&&<MenuSection title="Sotuvchi amallari" items={sellerTools}/>} {management&&<MenuSection title="Moliya" items={finance}/>}<MenuSection title="Operatsiyalar" items={ops}/><MenuSection title="Tizim" items={system}/>
 </div>;
}
