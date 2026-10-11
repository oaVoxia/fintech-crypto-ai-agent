import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const PORTFOLIO_KEY = 'paper_portfolio';
const STARTING_BALANCE = 10000;

export async function getPortfolio(): Promise<Record<string, number>> {
  if (redis) {
    const data = await redis.get<Record<string, number>>(PORTFOLIO_KEY);
    return data || { USD: STARTING_BALANCE };
  }
  // Fallback in-memory (resets on cold start)
  return (global as any).paperPortfolio || { USD: STARTING_BALANCE };
}

export async function savePortfolio(portfolio: Record<string, number>): Promise<void> {
  if (redis) {
    await redis.set(PORTFOLIO_KEY, portfolio);
  } else {
    (global as any).paperPortfolio = portfolio;
  }
}

export async function resetPortfolio(): Promise<Record<string, number>> {
  const fresh = { USD: STARTING_BALANCE };
  await savePortfolio(fresh);
  return fresh;
}