import {PageHeader} from "@/components/page-header";import {SaleForm} from "@/components/sale-form";
export default async function Sale({searchParams}:{searchParams:Promise<{product?:string}>}){const {product}=await searchParams;return <div className="page-pad inner-page"><PageHeader title="Telefon sotish" description="Ombordan mahsulot tanlang"/><SaleForm initialProduct={product}/></div>}
