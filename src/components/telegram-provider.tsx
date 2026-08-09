"use client";
import Script from "next/script";
import { useEffect } from "react";
export function TelegramProvider(){ useEffect(()=>{window.Telegram?.WebApp.ready();window.Telegram?.WebApp.expand();},[]); return <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive"/>; }
