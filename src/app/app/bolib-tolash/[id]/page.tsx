import {InstallmentDetail} from "@/components/installment-detail";
export const dynamic="force-dynamic";
export default async function InstallmentDetailPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <InstallmentDetail id={Number(id)}/>}
