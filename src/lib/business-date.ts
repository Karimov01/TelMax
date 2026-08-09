import { BUSINESS_TIME_ZONE } from "./constants";
export function businessDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
