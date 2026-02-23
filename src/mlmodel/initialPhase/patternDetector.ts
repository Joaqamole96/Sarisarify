import { v4 as uuid } from 'uuid';
import { getDatabase } from '@/infrastructure/database';
import type { Insight, ForecastItem } from '@/types';
import * as productRepository from '@/repositories/productRepository';

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function timeBucket(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

// ─────────────────────────────────────────────────────────────
// Pattern Detection
// ─────────────────────────────────────────────────────────────

async function detectPatterns(): Promise<Insight[]> {
  const db = await getDatabase();
  const insights: Insight[] = [];
  const now = new Date().toISOString();

  // Peak hour detection
  const hourRows = await db.getAllAsync<{ hour: number; count: number }>(
    `SELECT CAST(strftime('%H', datetime(confirmedAt / 1000, 'unixepoch', 'localtime')) AS INTEGER) AS hour,
            COUNT(*) AS count
     FROM sales
     GROUP BY hour
     ORDER BY count DESC
     LIMIT 1`
  );

  if (hourRows[0]) {
    const { hour, count } = hourRows[0];
    const bucket = timeBucket(hour);
    insights.push({
      id: uuid(),
      message: `Sales peak in the ${bucket} (around ${hour}:00). You had ${count} sales on average during this hour.`,
      generatedAt: now,
    });
  }

  // Best day-of-week detection
  const dayRows = await db.getAllAsync<{ dow: number; count: number }>(
    `SELECT CAST(strftime('%w', datetime(confirmedAt / 1000, 'unixepoch', 'localtime')) AS INTEGER) AS dow,
            COUNT(*) AS count
     FROM sales
     GROUP BY dow
     ORDER BY count DESC
     LIMIT 1`
  );

  if (dayRows[0]) {
    const label = DAY_LABELS[dayRows[0].dow];
    insights.push({
      id: uuid(),
      message: `${label}s tend to be your busiest day.`,
      generatedAt: now,
    });
  }

  // Frequency tier drop detection (Frequent → Normal within last 2 weeks)
  const products = await productRepository.getAllProducts();
  const recentDrops = products.filter(
    (p) => p.frequencyTier === 'NORMAL' || p.frequencyTier === 'SELDOM'
  );

  for (const p of recentDrops.slice(0, 3)) {
    if (p.frequencyTier === 'SELDOM') {
      insights.push({
        id: uuid(),
        message: `"${p.name}" hasn't been selling much lately. Consider checking your stock.`,
        generatedAt: now,
      });
    }
  }

  return insights;
}

// ─────────────────────────────────────────────────────────────
// Exponential Smoothing Forecast
// ─────────────────────────────────────────────────────────────

async function forecastDemand(): Promise<ForecastItem[]> {
  const db = await getDatabase();
  const products = await productRepository.getAllProducts();
  const now = new Date();
  const α = 0.3; // smoothing factor

  const forecasts: ForecastItem[] = [];

  for (const product of products) {
    // Get daily appearance counts for the last 14 days
    const rows = await db.getAllAsync<{ day: string; appearances: number }>(
      `SELECT date(s.confirmedAt / 1000, 'unixepoch', 'localtime') AS day,
              COUNT(DISTINCT s.id) AS appearances
       FROM saleItems si
       JOIN sales s ON s.id = si.saleId
       WHERE si.productId = ?
         AND s.confirmedAt >= ?
       GROUP BY day
       ORDER BY day ASC`,
      [product.id, now.getTime() - 14 * 24 * 60 * 60 * 1000]
    );

    if (rows.length === 0) continue;

    // Exponential smoothing over the daily series
    let smoothed = rows[0].appearances;
    for (let i = 1; i < rows.length; i++) {
      smoothed = α * rows[i].appearances + (1 - α) * smoothed;
    }

    const predicted = Math.round(smoothed);
    const confidence =
      rows.length >= 10 ? 'high' : rows.length >= 5 ? 'medium' : 'low';

    forecasts.push({ product, predictedDemand: predicted, confidence });
  }

  return forecasts.sort((a, b) => b.predictedDemand - a.predictedDemand);
}

// ─────────────────────────────────────────────────────────────
// Public Entry Point
// ─────────────────────────────────────────────────────────────

export async function runRules(): Promise<{
  insights: Insight[];
  forecast: ForecastItem[];
}> {
  const [insights, forecast] = await Promise.all([
    detectPatterns(),
    forecastDemand(),
  ]);
  return { insights, forecast };
}
