# TelMax'ni VPS'ga joylash

## Talablar

- Ubuntu 22.04/24.04, kamida 2 vCPU, 2 GB RAM, 20 GB SSD
- `80/tcp`, `443/tcp`, `443/udp` ochiq
- `telmax.uz` va `www.telmax.uz` VPS IP manziliga yo‘naltirilgan

Neon PostgreSQL va Cloudflare R2 VPS ichiga ko‘chirilmaydi; ilova ularga TLS orqali ulanadi.

## O‘rnatish

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker
sudo mkdir -p /opt/telmax && sudo chown "$USER":"$USER" /opt/telmax
git clone https://github.com/Karimov01/TelMax.git /opt/telmax
cd /opt/telmax
cp .env.vps.example .env.production
nano .env.production
chmod 600 .env.production
docker compose --env-file .env.production up -d --build
docker compose ps
```

Vercel Environment Variables ichidagi Neon, Telegram va R2 qiymatlarini `.env.production` ga ko‘chiring. Faylni Git'ga kiritmang. Caddy HTTPS sertifikatini avtomatik oladi.

## Telegram webhook

```bash
docker compose --env-file .env.production exec telmax node scripts/set-telegram-webhook.mjs
```

BotFather'dagi Mini App URL `https://telmax.uz/app` bo‘lsin.

## Tekshirish

```bash
curl -I https://telmax.uz
curl https://telmax.uz/api/health
docker compose logs --tail=100 telmax
```

Sayt, Mini App login, telefon olish/sotish, R2 rasm yuklash va savdoni bekor qilish tekshirilgachgina Vercel deploymentni o‘chiring.

## Yangilash

```bash
cd /opt/telmax
git pull --ff-only
docker compose --env-file .env.production up -d --build
docker image prune -f
```

## Muhim

- Secretlarni chat, Git yoki screenshotda oshkor qilmang.
- Cloudflare SSL/TLS rejimi `Full (strict)` bo‘lsin.
- Dastlab Cloudflare proxy'ni `DNS only` qilib sertifikat oling, so‘ng proxy'ni yoqing.
- Neon URL'da `sslmode=require` saqlansin.
