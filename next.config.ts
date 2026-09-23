import type { NextConfig } from "next";
const nextConfig: NextConfig = {
 output:"standalone",
 poweredByHeader:false,
 images:{
  remotePatterns:[{protocol:"https",hostname:"images.telmax.uz",pathname:"/phones/**"}],
  formats:["image/avif","image/webp"],
  qualities:[60,75,85],
 },
};
export default nextConfig;
