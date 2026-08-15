"use client";
import Link from "next/link"; import {usePathname} from "next/navigation"; import {BarChart3,Box,Home,User,WalletCards} from "./icons";
const items=[{href:"/app",label:"Bosh sahifa",Icon:Home},{href:"/app/ombor",label:"Ombor",Icon:Box},{href:"/app/sotish",label:"Savdo",Icon:WalletCards},{href:"/app/hisobot",label:"Hisobot",Icon:BarChart3},{href:"/app/boshqaruv",label:"Profil",Icon:User}];
export function BottomNav(){const path=usePathname();return <nav className="bottom-nav" aria-label="Asosiy navigatsiya">{items.map(({href,label,Icon})=>{const active=path===href||(href==="/app/hisobot"&&path.startsWith("/app/hisobot/"));return <Link key={href} href={href} className={active?"active":""}><Icon/><span>{label}</span></Link>})}</nav>}
