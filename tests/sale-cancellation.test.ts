import {describe,expect,it} from "vitest";
import {can} from "../src/lib/permissions";
import {assertSaleCancellable,cancellationTotals} from "../src/services/inventory";

describe("sale cancellation rules",()=>{
 it("is restricted to owner and admin",()=>{expect(can("OWNER","sale:cancel")).toBe(true);expect(can("ADMIN","sale:cancel")).toBe(true);expect(can("STAFF","sale:cancel")).toBe(false);expect(can("CUSTOMER","sale:cancel")).toBe(false)});
 it("restores smartphone and feature-phone quantities with historical cost",()=>{expect(cancellationTotals([{productId:1,batchId:1,inventoryUnitId:10,quantity:1,unitCostSnapshot:2_000_000,profitSnapshot:880_000},{productId:2,batchId:2,inventoryUnitId:null,quantity:2,unitCostSnapshot:105_000,profitSnapshot:64_000}])).toEqual({quantity:3,cost:2_210_000,profit:944_000})});
 it("blocks a repeated cancellation",()=>{expect(()=>assertSaleCancellable("ACTIVE")).not.toThrow();expect(()=>assertSaleCancellable("CANCELLED")).toThrow("allaqachon bekor qilingan")});
});
