import type {MetadataRoute} from "next"; import {APP_URL} from "@/lib/constants";
export default function sitemap():MetadataRoute.Sitemap{return ["","/telefonlar","/sensorli","/tugmali","/aloqa"].map(path=>({url:`${APP_URL}${path}`,lastModified:new Date(),changeFrequency:path?"weekly":"daily",priority:path?0.8:1}))}
