'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef } from 'react';

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
  [symbol: string]: {
    price: number;
    change24h: number;
  };
}

const TRACKED = [
  { binance: 'btcusdt', id: 'bitcoin', symbol: 'BTC' },
  { binance: 'ethusdt', id: 'ethereum', symbol: 'ETH' },
  { binance: 'solusdt', id: 'solana', symbol: 'SOL' },
  { binance: 'xrpusdt', id: 'ripple', symbol: 'XRP' },
];

export default function Home() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });
  const isLoading = status === 'submitted' || status === 'streaming';

  const [portfolio, setPortfolio] = useState<Portfolio>({ USD: 10000 });
  const [risk, setRisk] = useState<RiskMetrics | null>(null);
  const [prices, setPrices] = useState<PriceData>({});
  const [feedMode, setFeedMode] = useState<'websocket' | 'polling'>('websocket');
  const [wsStatus, setWsStatus] = useState<'connecting' | 'live' | 'error'>('connecting');
  const [lastPoll, setLastPoll] = useState<string>('');
  const [feedError, setFeedError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('SW registration failed:', err);
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [feedMode]);

  useEffect(() => {
    if (feedMode !== 'websocket') return;

    const streams = TRACKED.map(t => `${t.binance}@miniTicker`).join('/');
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    const connect = () => {
      if (wsRef.current) wsRef.current.close();
      setWsStatus('connecting');
      setFeedError(null);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setWsStatus('live');

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const data = msg.data;
          if (!data || !data.s) return;

          const symbol = data.s.replace('USDT', '');
          const price = parseFloat(data.c);
          const change = parseFloat(data.P);

          setPrices(prev => ({
            ...prev,
            [symbol]: { price, change24h: change },
          }));
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      ws.onerror = () => {
        setWsStatus('error');
        setFeedError('WebSocket error');
      };

      ws.onclose = () => {
        setWsStatus('error');
        if (feedMode === 'websocket') {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [feedMode]);

  useEffect(() => {
    if (feedMode !== 'polling') return;

    const fetchPrices = async () => {
      try {
        const ids = TRACKED.map(c => c.id).join(',');
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        if (!res.ok) {
          setFeedError(`Poll failed: ${res.status}`);
          return;
        }
        const data = await res.json();

        const newPrices: PriceData = {};
        TRACKED.forEach(coin => {
          const coinData = data[coin.id];
          if (coinData) {
            newPrices[coin.symbol] = {
              price: coinData.usd,
              change24h: coinData.usd_24h_change || 0,
            };
          }
        });
        setPrices(newPrices);
        setLastPoll(new Date().toLocaleTimeString());
        setFeedError(null);
      } catch (err) {
        setFeedError('Poll network error');
        console.error('Poll failed:', err);
      }
    };

    fetchPrices();
    pollIntervalRef.current = setInterval(fetchPrices, 45000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [feedMode]);

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
    <div className="min-h-screen bg-[#0a0a0d] text-gray-200">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              <span className="text-[#8b5cf6]">Fintech</span>
              <span className="text-gray-500 mx-1">&</span>
              <span className="text-[#34d399]">Crypto</span>
              <span className="text-gray-300"> Agent</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1.5">Research · Paper Trading · Risk Insights</p>
          </div>
          <div className="hidden md:block text-xs text-gray-500 bg-[#141418] border border-[#2a2a32] px-3 py-1.5 rounded-full">
            Simulation Only
          </div>
        </div>

        {/* Live Prices */}
        <div className="dashboard-card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-[#34d399]">Live Prices</h2>
            <div className="flex items-center gap-2">
              {feedMode === 'websocket' ? (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  wsStatus === 'live' ? 'bg-[#34d399]/10 text-[#34d399]' :
                  wsStatus === 'connecting' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-red-500/10 text-red-400'
                }`}>
                  {wsStatus === 'live' ? 'Live' : wsStatus === 'connecting' ? 'Connecting' : 'Reconnecting'}
                </span>
              ) : (
                <span className="text-xs text-gray-500">Updated {lastPoll || '...'}</span>
              )}
              <button
                onClick={() => setFeedMode(feedMode === 'websocket' ? 'polling' : 'websocket')}
                className="text-xs px-3 py-1 rounded-full bg-[#8b5cf6]/10 text-[#a78bfa] hover:bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 transition"
              >
                {feedMode === 'websocket' ? 'Polling' : 'WebSocket'}
              </button>
            </div>
          </div>
          {feedError && <p className="text-xs text-red-400 mb-3">{feedError}</p>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TRACKED.map(coin => {
              const data = prices[coin.symbol];
              const change = data?.change24h;
              return (
                <div key={coin.symbol} className="price-card">
                  <div className="text-xs text-gray-500 mb-1">{coin.symbol}</div>
                  <div className="text-lg md:text-xl font-mono text-white font-medium">
                    ${data?.price?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '—'}
                  </div>
                  {change !== undefined && (
                    <div className={`text-xs mt-1 font-medium ${change >= 0 ? 'text-[#34d399]' : 'text-red-400'}`}>
                      {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-600 mt-3 text-center">
            {feedMode === 'websocket' ? 'Binance WebSocket' : 'CoinGecko · ~45s'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-4 space-y-5">
            <div className="dashboard-card">
              <h2 className="text-sm font-medium text-[#34d399] mb-4">Paper Portfolio</h2>
              <div className="space-y-2.5 text-sm">
                {Object.entries(portfolio).length === 0 || (Object.keys(portfolio).length === 1 && portfolio.USD) ? (
                  <p className="text-gray-500 text-xs">Starting balance ready</p>
                ) : null}
                {Object.entries(portfolio).map(([symbol, amount]) => (
                  <div key={symbol} className="flex justify-between items-center">
                    <span className="text-gray-400">{symbol}</span>
                    <span className="font-mono text-white">{Number(amount).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] text-gray-600">Updates from agent actions</p>
            </div>

            <div className="dashboard-card">
              <h2 className="text-sm font-medium text-[#8b5cf6] mb-4">Risk Metrics</h2>
              {risk ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Value</span>
                    <span className="font-mono text-[#34d399]">${risk.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">P&L</span>
                    <span className={risk.pnl >= 0 ? 'text-[#34d399]' : 'text-red-400'}>
                      {risk.pnl >= 0 ? '+' : ''}${risk.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs">({risk.pnlPct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cash Ratio</span>
                    <span>{(risk.cashRatio * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Concentration</span>
                    <span>{(risk.concentration * 100).toFixed(1)}%</span>
                  </div>
                  <div className="pt-3 border-t border-[#2a2a32]">
                    <div className="text-xs text-gray-500 mb-1">Risk Score</div>
                    <div className="font-medium text-[#8b5cf6]">{risk.riskScore}</div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-xs leading-relaxed">Ask the agent to calculate portfolio value and risk. Metrics will appear here automatically.</p>
              )}
            </div>

            <div className="text-[11px] text-gray-600 px-1">
              CoinGecko · Basis Desk · X Sentiment · Bigdata.com<br />
              Not financial advice. Simulation only.
            </div>
          </div>

          {/* Chat */}
          <div className="lg:col-span-8">
            <div className="dashboard-card h-[640px] flex flex-col">
              <h2 className="text-sm font-medium mb-4 text-gray-300">Research Agent</h2>
              <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-1">
                {error && (
                  <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg p-3">
                    {error.message || 'Chat error. Check keys and connection.'}
                  </div>
                )}
                {messages.length === 0 && (
                  <div className="text-gray-500 text-sm leading-relaxed">
                    Ask about prices, sentiment, news, or paper trades.<br />
                    Try: <span className="text-gray-400">“Calculate my portfolio value and risk metrics”</span>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'
                    }`}>
                      {m.parts?.map((p: any) => p.type === 'text' ? p.text : '').join('') || ''}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="chat-bubble-ai px-3.5 py-2.5 rounded-2xl text-sm text-gray-500">
                      Thinking…
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) {
                  sendMessage({ text: input });
                  setInput('');
                }
              }} className="flex gap-2">
                <input
                  className="flex-1 bg-[#0a0a0d] border border-[#2a2a32] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#8b5cf6] transition"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask the agent…"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-40 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition"
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