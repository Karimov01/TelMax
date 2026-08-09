"use client";
import Link from "next/link"; import {usePathname} from "next/navigation"; import {BarChart3,Box,Home,WalletCards} from "./icons";
const items=[{href:"/app",label:"Bosh sahifa",Icon:Home},{href:"/app/ombor",label:"Ombor",Icon:Box},{href:"/app/sotish",label:"Savdo",Icon:WalletCards},{href:"/app/hisobot",label:"Hisobot",Icon:BarChart3},{href:"/app/boshqaruv",label:"Boshqaruv",Icon:Box}];
export function BottomNav(){const path=usePathname();return <nav className="bottom-nav" aria-label="Asosiy navigatsiya">{items.map(({href,label,Icon})=><Link key={href} href={href} className={path===href?"active":""}><Icon/><span>{label}</span></Link>)}</nav>}
