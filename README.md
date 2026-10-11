# Fintech & Crypto AI Agent

Mobile-friendly AI-powered research and paper-trading agent for cryptocurrency and fintech.

## Features (Phases 1-5)
- **PWA**: Installable on mobile (Add to Home Screen), offline shell, purple/obsidian theme.
- **Real-time prices**: Toggle WebSocket (Binance) or polling (CoinGecko).
- **Persistent paper portfolio** with Upstash Redis + risk metrics (auto-updating UI).
- **X sentiment**, Basis Desk news, CoinGecko MCP, optional Bigdata.com.
- **Risk controls**: Concentration, cash ratio, risk score. Paper mode default. Live path requires explicit user confirmation + limits (not enabled by default).
- **Capacitor Android**: Wrap the deployed web app as a native Android APK.
- **Push-ready**: Service worker supports push notifications (configure FCM for Android).

## Setup
1. Clone & `npm install`
2. Copy `.env.example` to `.env.local` and fill keys (AI, optional BIGDATA, UPSTASH for persistence).
3. `npm run dev` — mobile responsive dashboard.
4. Deploy to Vercel, update `capacitor.config.ts` server.url with your URL.
5. For Android:
   ```bash
   npm run cap:add:android
   npm run cap:sync
   npm run cap:open:android
   ```
   Build APK in Android Studio.

## Mobile Notes
- Bottom-friendly layout, large touch targets.
- PWA manifest + basic SW for installability.
- Live prices via WS/polling toggle.
- Not financial advice. Simulation/paper only by default. High risk if extending to live trading.

## Extending to Live
Add exchange API keys (user-provided), enforce max position/daily loss, require confirmation. Keep paper as default.

Built for Vercel + Capacitor.