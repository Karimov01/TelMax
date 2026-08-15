import {redirect} from "next/navigation";
import {StaffManager} from "@/components/staff-manager";
import {getSession} from "@/lib/session";
import {can} from "@/lib/permissions";

export default async function StaffPage(){const session=await getSession();if(!session||!can(session.role,"user:manage"))redirect("/app");return <div className="page-pad"><StaffManager/></div>}
