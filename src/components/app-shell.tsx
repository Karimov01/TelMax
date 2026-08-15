import type {ReactNode} from "react";
import {BottomNav} from "./bottom-nav";
import {TelegramProvider} from "./telegram-provider";
import type {Role} from "@/lib/permissions";
export function AppShell({children,role}:{children:ReactNode;role?:Role}){return <div className="mini-app"><TelegramProvider/><main>{children}</main><BottomNav role={role}/></div>}
