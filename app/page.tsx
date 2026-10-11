'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });
  const [portfolio, setPortfolio] = useState<{ [key: string]: number }>({ USD: 10000 });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Fintech & Crypto AI Agent</h1>
      <p className="text-gray-600 mb-6">Powered by Vercel AI SDK + free CoinGecko MCP. Analyze markets, get insights, and paper trade.</p>
      
      <div className="mb-4 p-4 bg-white rounded shadow">
        <h2 className="font-semibold">Paper Portfolio</h2>
        <pre className="text-sm">{JSON.stringify(portfolio, null, 2)}</pre>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4 h-96 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className={`mb-3 ${m.role === 'user' ? 'text-right' : ''}`}>
            <span className="font-semibold">{m.role === 'user' ? 'You' : 'Agent'}: </span>
            <span className="whitespace-pre-wrap">{m.content}</span>
          </div>
        ))}
        {isLoading && <div>Agent is thinking...</div>}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-1 border rounded p-2"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about crypto prices, trends, or simulate a trade..."
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
}