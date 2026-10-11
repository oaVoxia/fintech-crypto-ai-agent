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
};

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Free CoinGecko MCP (no key required)
  const coingeckoClient = await createMCPClient({
    transport: {
      type: 'http',
      url: 'https://mcp.api.coingecko.com/mcp',
    },
  });

  // Optional Bigdata.com MCP for deeper research (requires API key)
  const bigdataApiKey = process.env.BIGDATA_API_KEY;
  let bigdataClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;
  let bigdataTools = {};

  if (bigdataApiKey) {
    try {
      bigdataClient = await createMCPClient({
        transport: {
          type: 'http',
          url: 'https://mcp.bigdata.com/',
          headers: {
            'x-api-key': bigdataApiKey,
          },
        },
      });
      bigdataTools = await bigdataClient.tools();
    } catch (err) {
      console.error('Failed to connect to Bigdata MCP:', err);
    }
  }

  try {
    const coingeckoTools = await coingeckoClient.tools();
    const allTools = { ...coingeckoTools, ...bigdataTools, ...localTools };

    const result = await streamText({
      model: 'anthropic/claude-sonnet-4-5', // Configure via AI Gateway or your preferred provider
      system: `You are a professional Fintech and Cryptocurrency research AI agent.

You have access to:
1. Real-time crypto market data via CoinGecko MCP (prices, markets, trending, historical, on-chain).
2. Deep financial research via Bigdata.com MCP (when available): company tearsheets, market tearsheets, country economics, sentiment analysis, search across news/filings/transcripts, watchlists, and more.
3. Paper trading tools for simulated portfolio management.

Guidelines:
- Always prefer tool data over general knowledge for accuracy and citations.
- For company analysis, earnings, filings, or multi-asset research, use Bigdata tools (find_securities, bigdata_company_tearsheet, bigdata_search, bigdata_market_tearsheet, etc.).
- Combine sources: e.g. crypto prices from CoinGecko + equity context from Bigdata.
- Be concise, educational, and explicitly note that this is for analysis and simulation only — not financial advice.
- When Bigdata tools are unavailable (no API key), fall back to CoinGecko and general reasoning.
- Paper portfolio starts with $10,000 USD.`,
      messages,
      tools: allTools,
      maxSteps: 8,
    });

    return result.toDataStreamResponse();
  } finally {
    await coingeckoClient.close();
    if (bigdataClient) await bigdataClient.close();
  }
}