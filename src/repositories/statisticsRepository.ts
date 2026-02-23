import { getDatabase } from '@/infrastructure/database';
import type { StatsSummary, StatsPeriod, Product } from '@/types';

// ─────────────────────────────────────────────────────────────
// Period Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Returns the Unix timestamp boundaries for the last COMPLETED period.
 * "Current" period is always excluded — only completed periods are exported.
 */
function getCompletedPeriodBounds(period: StatsPeriod): { from: number; to: number } {
  const now = new Date();

  switch (period) {
    case 'DAY': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const end = new Date(yesterday);
      end.setHours(23, 59, 59, 999);
      return { from: yesterday.getTime(), to: end.getTime() };
    }
    case 'WEEK': {
      // Last completed Mon–Sun week
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon ... 6=Sat
      const daysToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
      const lastSunday = new Date(now);
      lastSunday.setDate(now.getDate() - daysToLastSunday);
      lastSunday.setHours(23, 59, 59, 999);
      const lastMonday = new Date(lastSunday);
      lastMonday.setDate(lastSunday.getDate() - 6);
      lastMonday.setHours(0, 0, 0, 0);
      return { from: lastMonday.getTime(), to: lastSunday.getTime() };
    }
    case 'MONTH': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      lastDayOfLastMonth.setHours(23, 59, 59, 999);
      return { from: lastMonth.getTime(), to: lastDayOfLastMonth.getTime() };
    }
    case 'YEAR': {
      const lastYear = now.getFullYear() - 1;
      const from = new Date(lastYear, 0, 1).getTime();
      const to = new Date(lastYear, 11, 31, 23, 59, 59, 999).getTime();
      return { from, to };
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Summary Query
// ─────────────────────────────────────────────────────────────

export async function getSummary(period: StatsPeriod): Promise<StatsSummary> {
  const db = await getDatabase();
  const { from, to } = getCompletedPeriodBounds(period);

  const aggregates = await db.getFirstAsync<{
    totalRevenue: number;
    transactionCount: number;
  }>(
    `SELECT
       SUM(si.priceAtSale * si.quantity) AS totalRevenue,
       COUNT(DISTINCT s.id)              AS transactionCount
     FROM sales s
     JOIN saleItems si ON si.saleId = s.id
     WHERE s.confirmedAt BETWEEN ? AND ?`,
    [from, to]
  );

  const topProductRows = await db.getAllAsync<{
    productId: string;
    name: string;
    price: number;
    iconId: string;
    createdAt: number;
    updatedAt: number;
    totalSold: number;
    revenue: number;
  }>(
    `SELECT
       p.id AS productId, p.name, p.price, p.iconId, p.createdAt, p.updatedAt,
       SUM(si.quantity)                    AS totalSold,
       SUM(si.priceAtSale * si.quantity)   AS revenue
     FROM saleItems si
     JOIN products p  ON p.id = si.productId
     JOIN sales s     ON s.id = si.saleId
     WHERE s.confirmedAt BETWEEN ? AND ?
     GROUP BY p.id
     ORDER BY totalSold DESC
     LIMIT 5`,
    [from, to]
  );

  const topProducts = topProductRows.map((row) => ({
    product: {
      id: row.productId,
      name: row.name,
      price: row.price,
      iconId: row.iconId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    } satisfies Product,
    totalSold: row.totalSold,
    revenue: row.revenue,
  }));

  return {
    period,
    from,
    to,
    totalRevenue: aggregates?.totalRevenue ?? 0,
    transactionCount: aggregates?.transactionCount ?? 0,
    topProducts,
  };
}
