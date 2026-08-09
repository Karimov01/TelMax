export {};
declare global { interface Window { Telegram?: { WebApp: { initData: string; ready(): void; expand(): void; close(): void; colorScheme: "light"|"dark"; themeParams: Record<string,string>; safeAreaInset?: { top:number; bottom:number; left:number; right:number }; contentSafeAreaInset?: { top:number; bottom:number; left:number; right:number } } } } }
