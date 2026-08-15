import {notFound} from "next/navigation";
import {DebtDetail} from "@/components/debt-detail";
export const dynamic="force-dynamic";
export default async function DebtPage({params}:{params:Promise<{id:string}>}){const {id}=await params,n=Number(id);if(!Number.isInteger(n)||n<1)notFound();return <DebtDetail id={n}/>}
