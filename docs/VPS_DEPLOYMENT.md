# TelMax'ni VPS'ga joylash

Ushbu serverda Nginx va boshqa loyihalar mavjud. TelMax faqat
`127.0.0.1:3020` portiga ulanadi; tashqi HTTP/HTTPS trafikni mavjud Nginx
boshqaradi. PostgreSQL alohida Docker volume'da VPS ichida ishlaydi.
Cloudflare R2 faqat rasmlar uchun ishlatiladi.

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

`POSTGRES_PASSWORD` uchun kuchli tasodifiy parol yarating. Telegram va R2
qiymatlarini `.env.production` ga kiriting. Faylni Git'ga kiritmang.

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
docker compose -p telmax exec postgres pg_isready -U telmax -d telmax
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
- PostgreSQL porti internetga chiqarilmasin; u faqat Docker ichki tarmog'ida.
- `telmax_postgres_data` volume'ini muntazam zaxiralang.
- `video.telmax.uz` va boshqa Nginx konfiguratsiyalariga tegmang.
