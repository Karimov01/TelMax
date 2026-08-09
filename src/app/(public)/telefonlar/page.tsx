import type {Metadata} from "next"; import {ProductGrid} from "@/components/product-grid";
export const metadata:Metadata={title:"Telefonlar",description:"TelMax do‘konidagi sensorli va tugmali telefonlar katalogi."};
export const dynamic="force-dynamic";
export default function Phones(){return <ProductGrid title="Barcha telefonlar" description="Omborda mavjud va sotuvga chiqarilgan telefonlar"/>}
