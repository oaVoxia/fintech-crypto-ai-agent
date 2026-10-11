# Fintech & Crypto AI Agent

AI-powered research and paper-trading agent for cryptocurrency and broader fintech markets.

Built with **Vercel AI SDK**, deployed on Vercel, and powered by:
- **CoinGecko MCP** (free, no key) for live crypto data
- **Bigdata.com MCP** (optional, API key) for deeper market research, company tearsheets, filings, sentiment, and multi-asset analysis

## Features
- Real-time crypto prices, markets, trending coins, historical data (CoinGecko)
- Deep research: company financials, earnings context, news/filings search, market tearsheets, country economics, sentiment (Bigdata.com)
- Paper trading simulation (buy/sell against a virtual $10k USD portfolio)
- Streaming chat interface
- Educational and risk-aware responses

## Setup
1. Clone the repo
2. `npm install` or `pnpm install`
3. Create a `.env.local` file:
   ```bash
   # Required for the LLM (recommended: Vercel AI Gateway)
   # AI_GATEWAY_API_KEY=your_key
   # Or use provider keys:
   # ANTHROPIC_API_KEY=...
   # OPENAI_API_KEY=...

   # Optional but recommended for deeper research
   BIGDATA_API_KEY=your_bigdata_api_key
   ```
4. Get a Bigdata.com API key:
   - Go to [platform.bigdata.com/api-keys](https://platform.bigdata.com/api-keys)
   - Create a key and paste it into `BIGDATA_API_KEY`
5. `npm run dev`
6. Deploy to Vercel and add the same environment variables in the project settings.

## Usage Examples
- “What’s the current price and 24h change of Bitcoin and Ethereum?”
- “Show me a company tearsheet for Coinbase or MicroStrategy.”
- “Search recent news and filings about Bitcoin ETF inflows.”
- “Give me the global market tearsheet and crypto performance.”
- “Paper buy $1000 of SOL at the current price, then show my portfolio.”
- “Analyze sentiment and recent developments for NVDA.”

## Notes
- CoinGecko MCP is free and keyless (subject to shared rate limits).
- Bigdata.com provides premium financial data with citations; usage is metered via your API key.
- Paper trading is in-memory only (resets on cold starts). Use a database for persistence in production.
- **Not financial advice.** For research, education, and simulation only.

## Extending
- Add more local tools (alerts, charts, risk metrics).
- Persist portfolio with Vercel Postgres / KV or Cloudflare D1.
- Integrate Stripe for premium tiers.
- Use Vercel Automations for scheduled research reports.

Built for Vercel + your connected Bigdata.com and other services.