import {MobileReport} from "@/components/mobile-report";
export default async function SaleDetailPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <MobileReport mode="detail" saleId={Number(id)}/>}
