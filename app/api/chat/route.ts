import { createMCPClient } from '@ai-sdk/mcp';
import { generateText, tool, streamText } from 'ai';
import { z } from 'zod';

// Simple in-memory paper portfolio (in production use DB)
let paperPortfolio: Record<string, number> = { USD: 10000 };

const localTools = {
  getPortfolio: tool({
    description: 'Get the current paper trading portfolio balances',
    parameters: z.object({}),
    execute: async () => paperPortfolio,
  }),
  paperTrade: tool({
    description: 'Simulate a buy or sell trade in the paper portfolio. Use CoinGecko data for current price.',
    parameters: z.object({
      action: z.enum(['buy', 'sell']),
      symbol: z.string().describe('Coin symbol like BTC, ETH'),
      amountUsd: z.number().positive().describe('Amount in USD to trade'),
      price: z.number().positive().describe('Current price of the coin in USD'),
    }),
    execute: async ({ action, symbol, amountUsd, price }) => {
      const coinAmount = amountUsd / price;
      if (action === 'buy') {
        if (paperPortfolio.USD < amountUsd) return { error: 'Insufficient USD' };
        paperPortfolio.USD -= amountUsd;
        paperPortfolio[symbol] = (paperPortfolio[symbol] || 0) + coinAmount;
      } else {
        const current = paperPortfolio[symbol] || 0;
        if (current < coinAmount) return { error: 'Insufficient coins' };
        paperPortfolio[symbol] -= coinAmount;
        paperPortfolio.USD += amountUsd;
      }
      return { success: true, portfolio: paperPortfolio };
    },
  }),
};

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Connect to free CoinGecko MCP
  const mcpClient = await createMCPClient({
    transport: {
      type: 'http',
      url: 'https://mcp.api.coingecko.com/mcp',
    },
  });

  try {
    const mcpTools = await mcpClient.tools();
    const allTools = { ...mcpTools, ...localTools };

    const result = await streamText({
      model: 'anthropic/claude-sonnet-4-5', // Use AI Gateway or set OPENAI_API_KEY / etc. via env
      system: `You are a helpful Fintech and Cryptocurrency AI agent.
You have access to real-time crypto market data via CoinGecko MCP tools.
You can also manage a paper trading portfolio with local tools.
Always use tools for accurate data. Be concise, educational, and risk-aware.
Never give financial advice; this is for analysis and simulation only.
Current paper portfolio starts with $10,000 USD.`,
      messages,
      tools: allTools,
      maxSteps: 5,
    });

    return result.toDataStreamResponse();
  } finally {
    await mcpClient.close();
  }
}