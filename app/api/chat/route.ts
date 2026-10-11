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
    description: 'Simulate a buy or sell trade in the paper portfolio. Use real prices from tools first.',
    parameters: z.object({
      action: z.enum(['buy', 'sell']),
      symbol: z.string().describe('Coin or ticker symbol like BTC, ETH, AAPL'),
      amountUsd: z.number().positive(),
      price: z.number().positive(),
    }),
    execute: async ({ action, symbol, amountUsd, price }) => {
      const portfolio = await getPortfolio();
      const units = amountUsd / price;
      if (action === 'buy') {
        if ((portfolio.USD || 0) < amountUsd) return { error: 'Insufficient USD' };
        portfolio.USD = (portfolio.USD || 0) - amountUsd;
        portfolio[symbol] = (portfolio[symbol] || 0) + units;
      } else {
        const current = portfolio[symbol] || 0;
        if (current < units) return { error: 'Insufficient holdings' };
        portfolio[symbol] = current - units;
        portfolio.USD = (portfolio.USD || 0) + amountUsd;
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
    description: 'Calculate current total portfolio value, P&L, and basic risk metrics. Pass live prices.',
    parameters: z.object({
      prices: z.record(z.string(), z.number()).describe('Map of symbol to current USD price'),
    }),
    execute: async ({ prices }) => {
      const portfolio = await getPortfolio();
      let totalValue = portfolio.USD || 0;
      const holdings: Record<string, { units: number; value: number }> = {};
      let maxHoldingValue = 0;

      for (const [symbol, units] of Object.entries(portfolio)) {
        if (symbol === 'USD') continue;
        const price = prices[symbol] || 0;
        const value = (units as number) * price;
        holdings[symbol] = { units: units as number, value };
        totalValue += value;
        if (value > maxHoldingValue) maxHoldingValue = value;
      }

      const starting = 10000;
      const pnl = totalValue - starting;
      const pnlPct = (pnl / starting) * 100;
      const cash = portfolio.USD || 0;
      const cashRatio = totalValue > 0 ? cash / totalValue : 1;
      const concentration = totalValue > 0 ? maxHoldingValue / totalValue : 0;

      let riskScore = 'Low';
      if (concentration > 0.6 || cashRatio < 0.1) riskScore = 'High';
      else if (concentration > 0.4 || cashRatio < 0.25) riskScore = 'Medium';

      return {
        totalValue,
        starting,
        pnl,
        pnlPct,
        cash,
        cashRatio,
        concentration,
        riskScore,
        holdings,
      };
    },
  }),
  getXSentiment: tool({
    description: 'Get real-time X/Twitter market sentiment and narrative for a ticker or topic.',
    parameters: z.object({
      query: z.string(),
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
      system: `You are a professional Fintech and Cryptocurrency research AI agent.

Data sources: CoinGecko (prices), Basis Desk (news), X sentiment, optional Bigdata.com, and persistent paper portfolio with risk metrics.

When the user asks for portfolio value or risk, first get live prices (CoinGecko), then call calculatePortfolioValue with those prices. Return the risk score, concentration, cash ratio, and P&L clearly.

Be concise, educational, and note that this is analysis and simulation only — not financial advice.`,
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