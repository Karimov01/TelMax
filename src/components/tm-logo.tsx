import Image from "next/image";
export function TmLogo({small=false}:{small?:boolean}){return <span className={`tm-logo ${small?"tm-logo-small":""}`}><Image src="/brand/telmax-mark-tight.png" alt="TelMax TM logo" width={96} height={96} priority/></span>}
export function FullLogo(){return <span className="full-logo"><Image src="/brand/telmax-mark-tight.png" alt="TelMax TM" width={72} height={72} priority/><span><b>Tel<span>Max</span></b><small>Telefon Do‘koni</small></span></span>}
