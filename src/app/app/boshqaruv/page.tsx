import Link from "next/link";
import {PageHeader} from "@/components/page-header";
import {getSession} from "@/lib/session";
import {can} from "@/lib/permissions";

const regular=[['investitsiya','💼','Investitsiya','Sarmoya va real kapital'],['qarzdorlar','💳','Qarzdorlar','Qarzlar va muddatlar'],['tolov','💵','To‘lov qabul qilish','Qarz to‘lovlari'],['bolib-tolash','🏢','Bo‘lib to‘lash','Hamkorlar hisoboti'],['qaytarish','↩️','Qaytarish','Qaytgan telefonlar']];
export default async function Management(){const session=process.env.NODE_ENV==="development"?{role:"OWNER" as const}:await getSession(),items=[...regular,...(session&&can(session.role,"sale:cancel")?[['savdoni-bekor-qilish','⊘','Savdoni bekor qilish','Xatolik bilan bajarilgan savdoni omborga qaytarish']]:[]),['sozlamalar','⚙️','Sozlamalar','Do‘kon va bot sozlamalari']];return <div className="page-pad inner-page"><PageHeader title="Boshqaruv" description="Eski botdagi barcha qo‘shimcha bo‘limlar"/><div className="management-grid">{items.map(([path,icon,title,text])=><Link className={path==="savdoni-bekor-qilish"?"danger-management":""} href={`/app/${path}`} key={path}><i>{icon}</i><span><strong>{title}</strong><small>{text}</small></span></Link>)}</div></div>}
