import type {Metadata} from "next"; import {notFound} from "next/navigation";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;return {title:`${slug.replaceAll("-"," ")} narxi`,robots:{index:false,follow:true}}}
export default function ProductPage(){notFound()}
