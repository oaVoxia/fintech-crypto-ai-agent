# Fintech & Crypto AI Agent

AI-powered agent for cryptocurrency analysis and paper trading, built with **Vercel AI SDK** and deployed on Vercel.

## Features
- Real-time crypto market data via free **CoinGecko MCP** server (`https://mcp.api.coingecko.com/mcp`)
- Paper trading simulation (buy/sell with local tools)
- Market analysis, price queries, trending coins, historical data
- Chat interface powered by AI SDK
- Fintech-focused: portfolio insights, risk notes

## Setup
1. Clone the repo
2. `npm install` or `pnpm install`
3. Set up an AI model key:
   - Recommended: Vercel AI Gateway (create key in Vercel dashboard)
   - Or set `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.
4. `npm run dev`
5. Deploy to Vercel: connect this GitHub repo or `vercel deploy`

## Usage
Ask questions like:
- "What's the current price of Bitcoin and Ethereum?"
- "Show me trending coins"
- "Analyze BTC performance over the last week"
- "Paper buy $1000 of ETH at current price"
- "What's my portfolio?"

## Notes
- Uses free CoinGecko MCP (rate-limited but no key required)
- Paper trading is simulated in-memory (reset on restart; use DB for production)
- Not financial advice. For education and analysis only.
- Integrates with your connected Bigdata.com for deeper market research if extended.

Built for Vercel. Enjoy!