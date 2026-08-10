import {describe,expect,it} from "vitest";
import {buildPurchasePayload,purchaseInputSchema} from "@/lib/purchase-contract";

const base={brand:"Novey",model:"Novey 105",description:"",color:"Qora",purchasePrice:105000,salePrice:137000,quantity:5,supplierName:"",supplierPhone:"",isPublished:0,storage:"128 GB",ram:"8 GB",imei1:"123456789012345",batteryHealth:"87",faceId:"Ishlaydi",trueTone:"Bor",icloud:"Toza",screen:"Original",battery:"Original",repair:"Ochilmagan"};
const cases=[
 ["A FEATURE yangi",{...base,category:"FEATURE_PHONE",platform:"FEATURE",condition:"Yangi"}],
 ["B FEATURE ishlatilgan",{...base,category:"FEATURE_PHONE",platform:"FEATURE",condition:"Ishlatilgan"}],
 ["C iOS yangi",{...base,category:"SMARTPHONE",platform:"IOS",condition:"Yangi"}],
 ["D iOS ishlatilgan",{...base,category:"SMARTPHONE",platform:"IOS",condition:"Ishlatilgan"}],
 ["E Android yangi",{...base,category:"SMARTPHONE",platform:"ANDROID",condition:"Yangi"}],
 ["F Android ishlatilgan",{...base,category:"SMARTPHONE",platform:"ANDROID",condition:"Ishlatilgan"}]
] as const;

describe("purchase payload contract",()=>{
 for(const [name,data] of cases)it(name,()=>{const payload=buildPurchasePayload(data);expect(purchaseInputSchema.safeParse(payload).success).toBe(true);expect(typeof payload.isPublished).toBe("boolean")});
 it("FEATURE faqat o‘ziga tegishli maydonlarni yuboradi",()=>{const payload=buildPurchasePayload(cases[0][1]);expect(payload).toMatchObject({category:"FEATURE_PHONE",platform:"FEATURE",purchasePrice:105000,salePrice:137000,quantity:5,isPublished:false});expect(payload).not.toHaveProperty("imei1");expect(payload).not.toHaveProperty("ram");expect(payload).not.toHaveProperty("faceId");expect(payload).not.toHaveProperty("trueTone");expect(payload).not.toHaveProperty("icloud");expect(payload.purchasePrice*payload.quantity).toBe(525000)});
 it("0/1 boolean sifatida emas, explicit true/false sifatida chiqadi",()=>{expect(buildPurchasePayload({...cases[0][1],isPublished:0}).isPublished).toBe(false);expect(buildPurchasePayload({...cases[0][1],isPublished:1}).isPublished).toBe(true)});
});
