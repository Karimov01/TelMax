import {getPublicCatalogFacets,listPublicCatalog} from "@/services/public-catalog";
import {PublicCatalogClient} from "./public-catalog-client";

export async function ProductGrid({title,description,category}:{title:string;description:string;category?:"SMARTPHONE"|"FEATURE_PHONE"}){
 const [items,facets]=await Promise.all([listPublicCatalog({category}),getPublicCatalogFacets()]);
 return <section className="catalog-page">
  <header><span>TELEFONLAR</span><h1>{title}</h1><p>{description}</p></header>
  <PublicCatalogClient items={items} facets={facets} category={category}/>
 </section>;
}
