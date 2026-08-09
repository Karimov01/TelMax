import crypto from "node:crypto";
import { z } from "zod";

const telegramUser = z.object({ id: z.number().int().positive(), first_name: z.string().min(1), last_name: z.string().optional(), username: z.string().optional(), photo_url: z.string().url().optional() });
export type TelegramUser = z.infer<typeof telegramUser>;

export function validateTelegramInitData(initData: string, maxAgeSeconds = Number(process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS ?? 3600)) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN sozlanmagan");
  const params = new URLSearchParams(initData); const hash = params.get("hash");
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) throw new Error("Telegram imzosi mavjud emas");
  params.delete("hash"); const authDate = Number(params.get("auth_date"));
  if (!Number.isInteger(authDate) || Math.abs(Date.now() / 1000 - authDate) > maxAgeSeconds) throw new Error("Telegram sessiyasi eskirgan");
  const dataCheckString = [...params.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}=${v}`).join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const expected = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expected, "hex"))) throw new Error("Telegram imzosi noto‘g‘ri");
  const rawUser = params.get("user"); if (!rawUser) throw new Error("Telegram foydalanuvchisi topilmadi");
  return { user: telegramUser.parse(JSON.parse(rawUser)), authDate };
}
