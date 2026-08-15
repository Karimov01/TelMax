import {redirect} from "next/navigation";
import {getSession} from "@/lib/session";
import {can} from "@/lib/permissions";
export default async function DebtLayout({children}:{children:React.ReactNode}){const session=await getSession();if(!session||!can(session.role,"report:read"))redirect("/app");return children;}
