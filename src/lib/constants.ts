export const BUSINESS_TIME_ZONE = "Asia/Tashkent";
const configuredAppUrl=process.env.NEXT_PUBLIC_APP_URL;export const APP_URL=configuredAppUrl&&/^https?:\/\//.test(configuredAppUrl)?configuredAppUrl:"http://localhost:3000";
export const BRAND = { name: "TelMax", subtitle: "Telefon Do‘koni", red: "#f3262f" } as const;
