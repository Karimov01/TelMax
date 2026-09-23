const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is missing");
}

const [meResponse, webhookResponse] = await Promise.all([
  fetch(`https://api.telegram.org/bot${token}/getMe`),
  fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`),
]);

const me = await meResponse.json();
const webhook = await webhookResponse.json();

if (!me.ok || !webhook.ok) {
  throw new Error("Telegram API verification failed");
}

console.log(
  JSON.stringify({
    ok: true,
    bot: me.result.username,
    webhookUrl: webhook.result.url,
    pendingUpdates: webhook.result.pending_update_count,
    lastError: webhook.result.last_error_message ?? null,
    secretConfigured: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
  }),
);
