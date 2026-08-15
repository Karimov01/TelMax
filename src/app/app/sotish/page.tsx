import {SaleForm} from "@/components/sale-form";
import {SalesDashboard} from "@/components/sales-dashboard";
import {getSalesDashboardData} from "@/services/sales-dashboard";
export const dynamic="force-dynamic";
export default async function Sale({searchParams}:{searchParams:Promise<{product?:string;new?:string;debt?:string}>}){const {product,new:start,debt}=await searchParams;if(product||start==="1")return <div className="page-pad"><SaleForm initialProduct={product} initialDebt={debt==="1"}/></div>;return <SalesDashboard data={await getSalesDashboardData()}/>}
