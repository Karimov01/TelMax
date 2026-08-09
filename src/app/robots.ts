import type {MetadataRoute} from "next"; import {APP_URL} from "@/lib/constants";
export default function robots():MetadataRoute.Robots{return {rules:[{userAgent:"*",allow:["/","/telefonlar","/sensorli","/tugmali","/aloqa"],disallow:["/app/","/api/"]}],sitemap:`${APP_URL}/sitemap.xml`}}
