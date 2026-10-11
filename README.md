# Fintech & Crypto AI Agent

AI-powered research and paper-trading agent for cryptocurrency and broader fintech markets.

Built with **Vercel AI SDK** and powered by multiple free + optional premium data sources:
- **CoinGecko MCP** — live crypto prices & markets (free)
- **Basis Desk MCP** — source-verified crypto news & market snapshots (free)
- **X/Twitter Sentiment** — real-time narrative & social signals via free SentimentAlpha preview
- **Bigdata.com MCP** — deeper company, filings, tearsheets & research (optional API key)

## Features
- Real-time crypto prices, markets, trending, historical data
- Source-verified crypto news and market context
- Real-time X/Twitter market sentiment and narrative velocity
- Deep research: company tearsheets, filings, news search, multi-asset analysis (with Bigdata key)
- Paper trading simulation
- Streaming chat interface

## Setup
1. Clone the repo
2. `npm install` or `pnpm install`
3. Create `.env.local`:
   ```bash
   # Required for the LLM (Vercel AI Gateway recommended)
   # AI_GATEWAY_API_KEY=your_key
   # ANTHROPIC_API_KEY=...
   # OPENAI_API_KEY=...

   # Optional for deeper research
   BIGDATA_API_KEY=your_bigdata_api_key
   ```
4. Get Bigdata key (optional): https://platform.bigdata.com/api-keys
5. `npm run dev`
6. Deploy to Vercel and add the same env vars.

## Usage Examples
- “What’s the price of Bitcoin and what is X sentiment saying about it?”
- “Show me the latest crypto news and market snapshot.”
- “Get X sentiment for $SOL and compare with price action.”
- “Give me a company tearsheet for Coinbase plus recent social narrative.”
- “Paper buy $500 of ETH and show my portfolio.”

## Notes
- All free sources (CoinGecko, Basis Desk, X sentiment preview) work out of the box with no keys.
- Bigdata.com adds premium cited research when `BIGDATA_API_KEY` is set.
- Paper trading is in-memory (resets on restart). Use a database for production persistence.
- **Not financial advice.** Research, education, and simulation only.

## Extending
- Persist portfolio (Vercel Postgres / KV).
- Add more local analysis tools.
- Integrate Stripe for premium features.
- Use official X API (pay-per-use) for higher volume if needed.

Built for Vercel.