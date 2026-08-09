import type {Metadata} from "next"; import {ProductGrid} from "@/components/product-grid";
export const metadata:Metadata={title:"Sensorli telefonlar",description:"TelMax sensorli telefonlar katalogi va narxlari."};
export const dynamic="force-dynamic";
export default function Smartphones(){return <ProductGrid title="Sensorli telefonlar" description="Android va iPhone modellari" category="SMARTPHONE"/>}
