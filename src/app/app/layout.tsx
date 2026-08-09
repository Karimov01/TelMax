import type {Metadata} from "next"; import {AppShell} from "@/components/app-shell"; import {AuthGate} from "@/components/auth-gate"; import {getSession} from "@/lib/session";
export const metadata:Metadata={title:"Boshqaruv",robots:{index:false,follow:false}};
export default async function MiniLayout({children}:{children:React.ReactNode}){const session=process.env.NODE_ENV==="development"?{role:"OWNER"}:await getSession();return <AppShell>{session?children:<AuthGate/>}</AppShell>}
