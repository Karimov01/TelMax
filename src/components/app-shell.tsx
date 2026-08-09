import type {ReactNode} from "react"; import {BottomNav} from "./bottom-nav"; import {TelegramProvider} from "./telegram-provider";
export function AppShell({children}:{children:ReactNode}){return <div className="mini-app"><TelegramProvider/><main>{children}</main><BottomNav/></div>}
