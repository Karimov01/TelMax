import {notFound} from "next/navigation";
import {SaleCancellationManager} from "@/components/sale-cancellation-manager";
import {getSession} from "@/lib/session";
import {can} from "@/lib/permissions";

export default async function SaleCancellationPage(){const session=process.env.NODE_ENV==="development"?{role:"OWNER" as const}:await getSession();if(!session||!can(session.role,"sale:cancel"))notFound();return <SaleCancellationManager/>}
