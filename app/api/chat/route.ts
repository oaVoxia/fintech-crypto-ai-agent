import { createMCPClient } from '@ai-sdk/mcp';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { getPortfolio, savePortfolio, resetPortfolio } from '@/lib/portfolio';

const localTools = {
  getPortfolio: tool({
    description: 'Get the current paper trading portfolio balances',
    parameters: z.object({}),
    execute: async () => await getPortfolio(),
  }),
  paperTrade: tool({
    description: 'Simulate a buy or sell trade in the paper portfolio. Use real prices from tools first. Persists if Redis is configured.',
    parameters: z.object({
      action: z.enum(['buy', 'sell']),
      symbol: z.string().describe('Coin or ticker symbol like BTC, ETH, AAPL'),
      amountUsd: z.number().positive().describe('Amount in USD to trade'),
      price: z.number().positive().describe('Current price in USD'),
    }),
    execute: async ({ action, symbol, amountUsd, price }) => {
      const portfolio = await getPortfolio();
      const units = amountUsd / price;
      if (action === 'buy') {
        if (portfolio.USD < amountUsd) return { error: 'Insufficient USD' };
        portfolio.USD -= amountUsd;
        portfolio[symbol] = (portfolio[symbol] || 0) + units;
      } else {
        const current = portfolio[symbol] || 0;
        if (current < units) return { error: 'Insufficient holdings' };
        portfolio[symbol] -= units;
        portfolio.USD += amountUsd;
      }
      await savePortfolio(portfolio);
      return { success: true, portfolio };
    },
  }),
  resetPortfolio: tool({
    description: 'Reset the paper portfolio back to the starting $10,000 USD',
    parameters: z.object({}),
    execute: async () => await resetPortfolio(),
  }),
  calculatePortfolioValue: tool({
    description: 'Calculate current total portfolio value and P&L by fetching live prices for holdings.',
    parameters: z.object({
      prices: z.record(z.string(), z.number()).describe('Map of symbol to current USD price, e.g. {BTC: 65000, ETH: 2500}'),
    }),
    execute: async ({ prices }) => {
      const portfolio = await getPortfolio();
      let totalValue = portfolio.USD || 0;
      const holdings: Record<string, { units: number; value: number }> = {};
      for (const [symbol, units] of Object.entries(portfolio)) {
        if (symbol === 'USD') continue;
        const price = prices[symbol] || 0;
        const value = units * price;
        holdings[symbol] = { units, value };
        totalValue += value;
      }
      const starting = 10000;
      const pnl = totalValue - starting;
      const pnlPct = (pnl / starting) * 100;
      return { totalValue, starting, pnl, pnlPct, holdings, cash: portfolio.USD };
    },
  }),
  getXSentiment: tool({
    description: 'Get real-time X/Twitter market sentiment, narrative velocity, and key signals for a crypto or fintech ticker/query using free SentimentAlpha preview.',
    parameters: z.object({
      query: z.string().describe('Ticker or topic like $BTC, Bitcoin, ETH, or "Bitcoin ETF"'),
    }),
    execute: async ({ query }) => {
      try {
        const res = await fetch('https://sentimentalpha.ai/v1/narrative-alpha/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        return { error: 'Failed to fetch X sentiment', details: String(err) };
      }
    },
  }),
};

export async function POST(req: Request) {
  const { messages } = await req.json();

  const coingeckoClient = await createMCPClient({
    transport: { type: 'http', url: 'https://mcp.api.coingecko.com/mcp' },
  });

  const basisClient = await createMCPClient({
    transport: { type: 'http', url: 'https://basisdesk.news/mcp' },
  });

  const bigdataApiKey = process.env.BIGDATA_API_KEY;
  let bigdataClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;
  let bigdataTools = {};

  if (bigdataApiKey) {
    try {
      bigdataClient = await createMCPClient({
        transport: {
          type: 'http',
          url: 'https://mcp.bigdata.com/',
          headers: { 'x-api-key': bigdataApiKey },
        },
      });
      bigdataTools = await bigdataClient.tools();
    } catch (err) {
      console.error('Bigdata MCP connection failed:', err);
    }
  }

  try {
    const coingeckoTools = await coingeckoClient.tools();
    const basisTools = await basisClient.tools();
    const allTools = { ...coingeckoTools, ...basisTools, ...bigdataTools, ...localTools };

    const result = await streamText({
      model: 'anthropic/claude-sonnet-4-5',
      system: `You are a professional Fintech and Cryptocurrency research AI agent with real-time data, sentiment, and persistent paper trading.

Data sources:
1. CoinGecko MCP: live crypto prices, markets, trending, historical.
2. Basis Desk MCP: source-verified crypto news, snapshots, whale transfers.
3. X sentiment tool (getXSentiment): real-time narrative from X.
4. Bigdata.com MCP (optional): company tearsheets, filings, research.
5. Persistent paper portfolio tools (getPortfolio, paperTrade, resetPortfolio, calculatePortfolioValue).

Guidelines:
- Always use tools for prices, news, sentiment, and portfolio state.
- When calculating portfolio value, first fetch live prices via CoinGecko tools, then pass them to calculatePortfolioValue.
- Combine sources for complete analysis.
- Note this is analysis and simulation only — not financial advice.
- Portfolio persists across sessions if Upstash Redis is configured; otherwise in-memory.`,
      messages,
      tools: allTools,
      maxSteps: 12,
    });

    return result.toDataStreamResponse();
  } finally {
    await coingeckoClient.close();
    await basisClient.close();
    if (bigdataClient) await bigdataClient.close();
  }
}