import {SaleForm} from "@/components/sale-form";
export default async function Sale({searchParams}:{searchParams:Promise<{product?:string}>}){const {product}=await searchParams;return <div className="page-pad"><SaleForm initialProduct={product}/></div>}
