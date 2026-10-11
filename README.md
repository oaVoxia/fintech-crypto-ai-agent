# Fintech & Crypto AI Agent

AI-powered research and paper-trading agent for cryptocurrency and broader fintech markets.

Built with **Vercel AI SDK** and powered by:
- **CoinGecko MCP** — live crypto prices & markets (free)
- **Basis Desk MCP** — source-verified crypto news & snapshots (free)
- **X/Twitter Sentiment** — real-time narrative via free SentimentAlpha preview
- **Bigdata.com MCP** — deeper company, filings, tearsheets (optional API key)
- **Persistent paper trading** — Upstash Redis (optional, free tier)

## Features
- Real-time crypto prices, markets, trending, historical data
- Source-verified crypto news and market context
- Real-time X/Twitter market sentiment and narrative
- Deep research with Bigdata (company tearsheets, filings, search)
- Persistent paper trading with P&L calculation
- Portfolio analysis tools
- Streaming chat interface

## Setup
1. Clone the repo
2. `npm install` or `pnpm install`
3. Create `.env.local`:
   ```bash
   # Required for the LLM
   # AI_GATEWAY_API_KEY=your_key
   # or ANTHROPIC_API_KEY / OPENAI_API_KEY

   # Optional: Bigdata.com for deeper research
   BIGDATA_API_KEY=your_key

   # Optional: Portfolio persistence (recommended)
   # Create free Redis at https://console.upstash.com/
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```
4. `npm run dev`
5. Deploy to Vercel and add the same environment variables.

## Usage Examples
- “What’s the price of Bitcoin and X sentiment on it?”
- “Paper buy $1000 of ETH at current price.”
- “Calculate my portfolio value and P&L.”
- “Show latest crypto news and market snapshot.”
- “Give me a company tearsheet for Coinbase.”
- “Reset my paper portfolio.”

## Notes
- Free sources work without keys. Bigdata and Redis are optional enhancements.
- Without Redis, portfolio is in-memory and resets on cold starts.
- With Upstash Redis (free tier), portfolio persists across sessions.
- **Not financial advice.** Research, education, and simulation only.

## Extending
- Add more analysis (risk metrics, allocation charts).
- Integrate Stripe for premium features.
- Add Vercel Cron for scheduled reports.

Built for Vercel.