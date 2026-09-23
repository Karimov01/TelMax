const token=process.env.TELEGRAM_BOT_TOKEN,secret=process.env.TELEGRAM_WEBHOOK_SECRET,appUrl=process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/,"");
if(!token||!secret||!appUrl)throw new Error("TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET va NEXT_PUBLIC_APP_URL kerak");
const url=`${appUrl}/api/telegram/webhook`;
const response=await fetch(`https://api.telegram.org/bot${token}/setWebhook`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url,secret_token:secret,drop_pending_updates:false,allowed_updates:["message","callback_query"]})});
const result=await response.json();
if(!response.ok||!result.ok)throw new Error(`Telegram webhook xatosi: ${JSON.stringify(result)}`);
console.log(`Webhook o‘rnatildi: ${url}`);
