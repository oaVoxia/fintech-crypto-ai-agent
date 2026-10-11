# Fintech & Crypto AI Agent

Mobile-friendly AI-powered research and paper-trading agent for cryptocurrency and fintech.

## Features
- **PWA**: Installable (Add to Home Screen). Service worker registered. Purple/obsidian theme.
- **Real-time prices**: Toggle WebSocket (Binance) or polling (CoinGecko) with error handling and clean reconnects.
- **Persistent paper portfolio** with Upstash Redis + risk metrics (auto-updating UI).
- **X sentiment**, Basis Desk news, CoinGecko MCP, optional Bigdata.com.
- **Risk controls**: Concentration, cash ratio, risk score. Paper mode default.
- **Capacitor Android**: Live server.url mode (update URL after Vercel deploy).
- **Push-ready** service worker.

## Setup
1. Clone & `npm install`
2. Copy `.env.example` to `.env.local` and fill keys (AI provider required, optional BIGDATA, UPSTASH).
3. `npm run dev`
4. Deploy to Vercel.
5. Update `capacitor.config.ts` `server.url` (or set CAPACITOR_SERVER_URL) with your live URL.
6. For Android:
   ```bash
   npm run cap:add:android
   npm run cap:sync
   npm run cap:open:android
   ```
   Build APK in Android Studio.

## PWA Icons
Add `public/icon-192.png` and `public/icon-512.png` (or generate via realfavicongenerator.net) for full install experience. Manifest references them.

## Notes
- Without Redis, portfolio is in-memory per instance and resets on cold starts.
- Not financial advice. Simulation/paper only by default.
- Chat errors and feed errors now surface in the UI.

Built for Vercel + Capacitor.