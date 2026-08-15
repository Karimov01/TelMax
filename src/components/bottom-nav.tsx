"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {BarChart3,Box,Home,User,WalletCards} from "./icons";
import type {Role} from "@/lib/permissions";

const items=[
 {href:"/app",label:"Bosh sahifa",Icon:Home},
 {href:"/app/ombor",label:"Ombor",Icon:Box},
 {href:"/app/sotish",label:"Savdo",Icon:WalletCards},
 {href:"/app/hisobot",label:"Hisobot",Icon:BarChart3,permission:"report" as const},
 {href:"/app/boshqaruv",label:"Profil",Icon:User},
];
export function BottomNav({role}:{role?:Role}){const path=usePathname();const visible=items.filter(item=>item.permission!=="report"||role!=="STAFF");return <nav className="bottom-nav" aria-label="Asosiy navigatsiya" style={{gridTemplateColumns:`repeat(${visible.length},1fr)`}}>{visible.map(({href,label,Icon})=>{const active=path===href||(href==="/app/hisobot"&&path.startsWith("/app/hisobot/"));return <Link key={href} href={href} className={active?"active":""}><Icon/><span>{label}</span></Link>})}</nav>}
