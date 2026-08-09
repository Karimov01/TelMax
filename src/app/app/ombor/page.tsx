import {PageHeader} from "@/components/page-header";import {InventoryManager} from "@/components/inventory-manager";
export default function Inventory(){return <div className="page-pad inner-page"><PageHeader title="Ombor" description="Barcha telefonlar va qoldiqlar" action={{href:"/app/sotib-olish",label:"Telefon qo‘shish"}}/><InventoryManager/></div>}
