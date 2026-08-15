import {PublicHeader} from "@/components/public-header";
import {PublicFooter} from "@/components/public-footer";
import "../public-catalog.css";

export default function PublicLayout({children}:{children:React.ReactNode}){
 return <div className="public-site"><PublicHeader/><main>{children}</main><PublicFooter/></div>;
}
