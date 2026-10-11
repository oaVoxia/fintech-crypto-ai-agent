import { createMCPClient } from '@ai-sdk/mcp';
import { streamText, tool } from 'ai';
import { z } from 'zod';

// Simple in-memory paper portfolio (in production use a database)
let paperPortfolio: Record<string, number> = { USD: 10000 };

const localTools = {
  getPortfolio: tool({
    description: 'Get the current paper trading portfolio balances',
    parameters: z.object({}),
    execute: async () => paperPortfolio,
  }),
  paperTrade: tool({
    description: 'Simulate a buy or sell trade in the paper portfolio. Use real prices from tools first.',
    parameters: z.object({
      action: z.enum(['buy', 'sell']),
      symbol: z.string().describe('Coin or ticker symbol like BTC, ETH, AAPL'),
      amountUsd: z.number().positive().describe('Amount in USD to trade'),
      price: z.number().positive().describe('Current price in USD'),
    }),
    execute: async ({ action, symbol, amountUsd, price }) => {
      const units = amountUsd / price;
      if (action === 'buy') {
        if (paperPortfolio.USD < amountUsd) return { error: 'Insufficient USD' };
        paperPortfolio.USD -= amountUsd;
        paperPortfolio[symbol] = (paperPortfolio[symbol] || 0) + units;
      } else {
        const current = paperPortfolio[symbol] || 0;
        if (current < units) return { error: 'Insufficient holdings' };
        paperPortfolio[symbol] -= units;
        paperPortfolio.USD += amountUsd;
      }
      return { success: true, portfolio: paperPortfolio };
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
        const data = await res.json();
        return data;
      } catch (err) {
        return { error: 'Failed to fetch X sentiment', details: String(err) };
      }
    },
  }),
};

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Free CoinGecko MCP
  const coingeckoClient = await createMCPClient({
    transport: {
      type: 'http',
      url: 'https://mcp.api.coingecko.com/mcp',
    },
  });

  // Free Basis Desk crypto news MCP
  const basisClient = await createMCPClient({
    transport: {
      type: 'http',
      url: 'https://basisdesk.news/mcp',
    },
  });

  // Optional Bigdata.com MCP
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
      system: `You are a professional Fintech and Cryptocurrency research AI agent with real-time market data and sentiment.

Data sources:
1. CoinGecko MCP: live crypto prices, markets, trending, historical, on-chain.
2. Basis Desk MCP: source-verified crypto news, market snapshots, whale transfers, daily briefs.
3. X/Twitter sentiment tool (getXSentiment): real-time narrative, velocity, and signals from X via free preview.
4. Bigdata.com MCP (if API key set): company tearsheets, filings/news search, market/country tearsheets, sentiment, watchlists.
5. Paper trading tools.

Guidelines:
- Prefer tools for all factual data, prices, news, and sentiment.
- Use getXSentiment for social buzz, narrative shifts, or "what is CT saying about X".
- Combine sources (e.g. price from CoinGecko + sentiment from X + news from Basis/Bigdata).
- Be concise, cite sources where possible, and note this is analysis/simulation only — not financial advice.
- Paper portfolio starts with $10,000 USD.`,
      messages,
      tools: allTools,
      maxSteps: 10,
    });

    return result.toDataStreamResponse();
  } finally {
    await coingeckoClient.close();
    await basisClient.close();
    if (bigdataClient) await bigdataClient.close();
  }
}