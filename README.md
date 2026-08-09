# TelMax

TelMax Telegram Mini App va `telmax.uz` public katalogi. Loyiha Next.js App Router, TypeScript, Neon PostgreSQL, Drizzle ORM va Telegram Bot API asosida qurilgan.

## Ishga tushirish

1. `.env.example` dan `.env.local` yarating.
2. TelMax uchun alohida Neon `DATABASE_URL`, bot tokeni, webhook secret va owner Telegram ID kiriting.
3. `drizzle/0000_telmax_initial.sql` migratsiyasini yangi Neon bazaga qo‘llang.
4. `pnpm dev` bilan local ishga tushiring.

Productionda `/app` faqat Telegram tomonidan imzolangan, muddati o‘tmagan `initData` va database roli bilan ochiladi. Public API modellari tannarx, foyda yoki admin ma’lumotini qaytarmaydi.

Eski MySQL migratsiya strategiyasi `docs/MIGRATION.md` ichida. Eski bot manbasi va database’ga avtomatik yozilmaydi.
