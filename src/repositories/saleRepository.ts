import { v4 as uuid } from 'uuid';
import { getDatabase } from '@/infrastructure/database';
import type {
  Sale,
  SaleItem,
  SaleWithItems,
  ConfirmSalePayload,
} from '@/types';
import * as borrowRepository from './borrowRepository';

// ─────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────

export async function getTotalSaleCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM sales'
  );
  return result?.count ?? 0;
}

export async function getRecentSaleIds(limit: number): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM sales ORDER BY confirmedAt DESC LIMIT ?',
    [limit]
  );
  return rows.map((r) => r.id);
}

export async function getSalesLog(
  page: number,
  pageSize = 20
): Promise<SaleWithItems[]> {
  const db = await getDatabase();
  const sales = await db.getAllAsync<Sale>(
    'SELECT * FROM sales ORDER BY confirmedAt DESC LIMIT ? OFFSET ?',
    [pageSize, page * pageSize]
  );

  return Promise.all(sales.map(enrichSaleWithItems));
}

export async function getSaleById(id: string): Promise<SaleWithItems | null> {
  const db = await getDatabase();
  const sale = await db.getFirstAsync<Sale>(
    'SELECT * FROM sales WHERE id = ?',
    [id]
  );
  if (!sale) return null;
  return enrichSaleWithItems(sale);
}

async function enrichSaleWithItems(sale: Sale): Promise<SaleWithItems> {
  const db = await getDatabase();
  const items = await db.getAllAsync<
    SaleItem & { productName: string; productPrice: number; productIconId: string }
  >(
    `SELECT si.*, p.name AS productName, p.price AS productPrice, p.iconId AS productIconId
     FROM saleItems si
     JOIN products p ON p.id = si.productId
     WHERE si.saleId = ?`,
    [sale.id]
  );

  const mapped = items.map((row) => ({
    id: row.id,
    saleId: row.saleId,
    productId: row.productId,
    quantity: row.quantity,
    priceAtSale: row.priceAtSale,
    isBorrowed: Boolean(row.isBorrowed),
    product: {
      id: row.productId,
      name: row.productName,
      price: row.productPrice,
      iconId: row.productIconId,
      createdAt: 0,
      updatedAt: 0,
    },
  }));

  const total = mapped.reduce(
    (sum, item) => sum + item.priceAtSale * item.quantity,
    0
  );

  return { ...sale, items: mapped, total };
}

// ─────────────────────────────────────────────────────────────
// Confirm Sale (atomic transaction)
// ─────────────────────────────────────────────────────────────

export async function confirmSale(payload: ConfirmSalePayload): Promise<Sale> {
  const db = await getDatabase();
  const now = Date.now();

  const sale: Sale = {
    id: uuid(),
    paymentMethod: payload.paymentMethod,
    confirmedAt: now,
  };

  await db.withTransactionAsync(async () => {
    // 1. Insert Sale
    await db.runAsync(
      'INSERT INTO sales (id, paymentMethod, confirmedAt) VALUES (?, ?, ?)',
      [sale.id, sale.paymentMethod, sale.confirmedAt]
    );

    // 2. Insert SaleItems (snapshot priceAtSale from product at this moment)
    for (const item of payload.items) {
      await db.runAsync(
        `INSERT INTO saleItems (id, saleId, productId, quantity, priceAtSale, isBorrowed)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          uuid(),
          sale.id,
          item.product.id,
          item.quantity,
          item.product.price, // snapshot
          item.isBorrowed ? 1 : 0,
        ]
      );
    }

    // 3. Create Borrow record if applicable
    if (
      payload.paymentMethod === 'BORROW' ||
      payload.paymentMethod === 'PARTIAL'
    ) {
      if (!payload.borrowerName) {
        throw new Error('borrowerName is required for BORROW or PARTIAL sales');
      }
      await borrowRepository.createBorrowForSale(
        db,
        sale.id,
        payload.borrowerName,
        payload.items,
        now
      );
    }
  });

  return sale;
}
