import type {Metadata} from "next"; import {ProductGrid} from "@/components/product-grid";
export const metadata:Metadata={title:"Tugmali telefonlar",description:"TelMax tugmali telefonlar katalogi va narxlari."};
export default function FeaturePhones(){return <ProductGrid title="Tugmali telefonlar" description="Sodda va ishonchli telefonlar"/>}
