import {describe,expect,it} from "vitest";
import {normalizeInventoryNumbers} from "@/services/catalog";

const row={id:2,brand:"Novey",model:"Novey 105",salePrice:137000,warrantyDays:0,quantity:5,purchasePrice:105000};

describe("inventory API numeric contract",()=>{
  it("Neon SUM va BIGINT text qiymatlarini canonical number qiladi",()=>{
    const result=normalizeInventoryNumbers({...row,id:"2",salePrice:"137000",warrantyDays:"0",quantity:"5",purchasePrice:"105000"} as unknown as typeof row);
    expect(result).toMatchObject({id:2,quantity:5,purchasePrice:105000,salePrice:137000});
    expect(Object.values({quantity:result.quantity,purchasePrice:result.purchasePrice,salePrice:result.salePrice}).every(v=>typeof v==="number")).toBe(true);
  });

  it("yo‘qolgan yoki buzilgan qiymatni 0 fallback bilan yashirmaydi",()=>{
    expect(()=>normalizeInventoryNumbers({...row,quantity:undefined} as unknown as typeof row)).toThrow("quantity raqam emas");
    expect(()=>normalizeInventoryNumbers({...row,purchasePrice:"x"} as unknown as typeof row)).toThrow("purchasePrice raqam emas");
  });
});
