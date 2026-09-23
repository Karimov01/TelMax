# TelMax'ni VPS'ga joylash

Ushbu serverda Nginx va boshqa loyihalar mavjud. TelMax faqat
`127.0.0.1:3020` portiga ulanadi; tashqi HTTP/HTTPS trafikni mavjud Nginx
boshqaradi. Neon PostgreSQL va Cloudflare R2 tashqi boshqariladigan xizmatlar
bo'lib qoladi.

## O'rnatish

```bash
git clone https://github.com/Karimov01/TelMax.git /opt/telmax
cd /opt/telmax
cp .env.vps.example .env.production
nano .env.production
chmod 600 .env.production
docker compose -p telmax --env-file .env.production up -d --build
docker compose -p telmax ps
```

Vercel Environment Variables ichidagi Neon, Telegram va R2 qiymatlarini
`.env.production` ga ko'chiring. Faylni Git'ga kiritmang.

## Nginx va HTTPS

```bash
sudo install -m 644 deploy/nginx-telmax.conf /etc/nginx/sites-available/telmax
sudo ln -s /etc/nginx/sites-available/telmax /etc/nginx/sites-enabled/telmax
sudo nginx -t
sudo systemctl reload nginx
```

`telmax.uz` va `www.telmax.uz` DNS yozuvlari VPS manziliga o'tgach:

```bash
sudo certbot --nginx -d telmax.uz -d www.telmax.uz
```

## Telegram webhook

```bash
docker compose -p telmax --env-file .env.production exec telmax \
  node scripts/set-telegram-webhook.mjs
```

BotFather'dagi Mini App URL `https://telmax.uz/app` bo'lsin.

## Tekshirish

```bash
curl http://127.0.0.1:3020/api/health
curl -I https://telmax.uz
docker compose -p telmax logs --tail=100 telmax
```

Sayt, Mini App login, telefon olish/sotish, R2 rasm yuklash va savdoni bekor
qilish tekshirilgachgina Vercel deploymentni o'chiring.

## Yangilash

```bash
cd /opt/telmax
git pull --ff-only
docker compose -p telmax --env-file .env.production up -d --build
```

## Muhim

- Secretlarni chat, Git yoki screenshotda oshkor qilmang.
- Cloudflare SSL/TLS rejimi `Full (strict)` bo'lsin.
- Sertifikat olishda Cloudflare proxy vaqtincha `DNS only` bo'lsin.
- Neon URL'da `sslmode=require` saqlansin.
- `video.telmax.uz` va boshqa Nginx konfiguratsiyalariga tegmang.
