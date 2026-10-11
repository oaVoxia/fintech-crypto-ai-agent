'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';

interface Portfolio {
  [key: string]: number;
}

interface RiskMetrics {
  totalValue: number;
  pnl: number;
  pnlPct: number;
  cashRatio: number;
  concentration: number;
  riskScore: string;
  holdings: Record<string, { units: number; value: number }>;
  cash?: number;
}

interface PriceData {
  [id: string]: {
    usd: number;
    usd_24h_change?: number;
  };
}

const TRACKED_COINS = [
  { id: 'bitcoin', symbol: 'BTC' },
  { id: 'ethereum', symbol: 'ETH' },
  { id: 'solana', symbol: 'SOL' },
  { id: 'ripple', symbol: 'XRP' },
];

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  const [portfolio, setPortfolio] = useState<Portfolio>({ USD: 10000 });
  const [risk, setRisk] = useState<RiskMetrics | null>(null);
  const [prices, setPrices] = useState<PriceData>({});
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Real-time price feed (CoinGecko public API, polled every 45s)
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const ids = TRACKED_COINS.map(c => c.id).join(',');
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        if (!res.ok) return;
        const data: PriceData = await res.json();
        setPrices(data);
        setLastUpdate(new Date().toLocaleTimeString());
      } catch (err) {
        console.error('Price fetch failed:', err);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 45000);
    return () => clearInterval(interval);
  }, []);

  // Auto-update portfolio and risk metrics when agent tool results arrive
  useEffect(() => {
    if (!messages.length) return;

    for (let i = messages.length - 1; i >= Math.max(0, messages.length - 5); i--) {
      const msg = messages[i];
      if (msg.role !== 'assistant') continue;

      const toolInvocations = (msg as any).toolInvocations || [];
      const parts = (msg as any).parts || [];

      for (const inv of toolInvocations) {
        if (inv.state === 'result' && inv.result) {
          if (['getPortfolio', 'paperTrade', 'resetPortfolio'].includes(inv.toolName)) {
            const result = inv.result;
            if (result.portfolio) setPortfolio(result.portfolio);
            else if (typeof result === 'object' && !result.error) setPortfolio(result);
          }
          if (inv.toolName === 'calculatePortfolioValue' && inv.result.totalValue !== undefined) {
            setRisk(inv.result);
            if (inv.result.holdings) {
              const newPort: Portfolio = { USD: inv.result.cash || 0 };
              Object.entries(inv.result.holdings).forEach(([sym, data]: any) => {
                newPort[sym] = data.units;
              });
              setPortfolio(newPort);
            }
          }
        }
      }

      for (const part of parts) {
        if (part.type?.startsWith('tool-') && part.state === 'output-available' && part.output) {
          const toolName = part.type.replace('tool-', '');
          const output = part.output;

          if (['getPortfolio', 'paperTrade', 'resetPortfolio'].includes(toolName)) {
            if (output.portfolio) setPortfolio(output.portfolio);
            else if (typeof output === 'object' && !output.error) setPortfolio(output);
          }
          if (toolName === 'calculatePortfolioValue' && output.totalValue !== undefined) {
            setRisk(output);
            if (output.holdings) {
              const newPort: Portfolio = { USD: output.cash || 0 };
              Object.entries(output.holdings).forEach(([sym, data]: any) => {
                newPort[sym] = data.units;
              });
              setPortfolio(newPort);
            }
          }
        }
      }
    }
  }, [messages]);

  return (
    <div className="min-h-screen bg-[#0f0f12] text-gray-200 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              <span className="text-[#8b5cf6]">Fintech</span> &
              <span className="text-[#34d399]"> Crypto</span> Agent
            </h1>
            <p className="text-gray-400 mt-1">Purple · Obsidian · Grey · Mint Dashboard</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            Paper Trading · Research Only
          </div>
        </div>

        {/* Real-time Price Ticker */}
        <div className="dashboard-card mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[#34d399]">Live Prices</h2>
            <span className="text-xs text-gray-500">Updated {lastUpdate || '...'}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TRACKED_COINS.map(coin => {
              const data = prices[coin.id];
              const change = data?.usd_24h_change;
              return (
                <div key={coin.id} className="text-center">
                  <div className="text-sm text-gray-400">{coin.symbol}</div>
                  <div className="text-xl font-mono text-white">
                    ${data?.usd?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '---'}
                  </div>
                  {change !== undefined && (
                    <div className={`text-xs font-medium ${change >= 0 ? 'text-[#34d399]' : 'text-red-400'}`}>
                      {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-600 mt-2 text-center">Source: CoinGecko (public API, ~45s refresh)</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Portfolio & Risk */}
          <div className="lg:col-span-1 space-y-6">
            <div className="dashboard-card">
              <h2 className="text-lg font-semibold text-[#34d399] mb-3">Paper Portfolio</h2>
              <div className="space-y-2 text-sm">
                {Object.entries(portfolio).map(([symbol, amount]) => (
                  <div key={symbol} className="flex justify-between">
                    <span className="text-gray-400">{symbol}</span>
                    <span className="font-mono">{Number(amount).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500">Auto-updates from agent tool results</p>
            </div>

            <div className="dashboard-card">
              <h2 className="text-lg font-semibold text-[#8b5cf6] mb-3">Risk Metrics</h2>
              {risk ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Value</span>
                    <span className="font-mono text-[#34d399]">${risk.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">P&L</span>
                    <span className={risk.pnl >= 0 ? 'text-[#34d399]' : 'text-red-400'}>
                      {risk.pnl >= 0 ? '+' : ''}${risk.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({risk.pnlPct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cash Ratio</span>
                    <span>{(risk.cashRatio * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Concentration</span>
                    <span>{(risk.concentration * 100).toFixed(1)}%</span>
                  </div>
                  <div className="pt-2 border-t border-gray-700">
                    <span className="text-gray-400">Risk Score</span>
                    <div className="mt-1 font-semibold text-[#8b5cf6]">{risk.riskScore}</div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Ask the agent to calculate portfolio value & risk to populate metrics. They will auto-update here.</p>
              )}
            </div>

            <div className="dashboard-card text-xs text-gray-500">
              <p>Sources: CoinGecko · Basis Desk · X Sentiment · Bigdata.com</p>
              <p className="mt-1">Not financial advice. Simulation only.</p>
            </div>
          </div>

          {/* Right: Chat */}
          <div className="lg:col-span-2">
            <div className="dashboard-card h-[600px] flex flex-col">
              <h2 className="text-lg font-semibold mb-3">Research Agent</h2>
              <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
                {messages.length === 0 && (
                  <div className="text-gray-500 text-sm">
                    Ask about prices, X sentiment, news, company tearsheets, or paper trade.
                    <br />
                    Try: “Calculate my portfolio value and risk metrics”
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`text-sm ${m.role === 'user' ? 'text-right' : ''}`}>
                    <span className={`inline-block px-3 py-2 rounded-lg max-w-[85%] ${
                      m.role === 'user'
                        ? 'bg-[#8b5cf6]/20 text-purple-100'
                        : 'bg-[#1a1a20] border border-gray-800'
                    }`}>
                      {typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}
                    </span>
                  </div>
                ))}
                {isLoading && <div className="text-gray-500 text-sm">Agent thinking…</div>}
              </div>

              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  className="flex-1 bg-[#0f0f12] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8b5cf6]"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask the agent…"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}