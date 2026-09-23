import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  eager?: boolean;
};

export function OptimizedImage({src,alt,className,width=240,height=240,sizes,eager=false}:Props){
 const localPreview=src.startsWith("blob:")||src.startsWith("data:");
 if(localPreview)return <Image src={src} alt={alt} className={className} width={width} height={height} unoptimized/>;
 return <Image src={src} alt={alt} className={className} width={width} height={height} sizes={sizes} loading={eager?"eager":"lazy"}/>;
}
