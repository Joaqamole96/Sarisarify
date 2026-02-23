import { v4 as uuid } from 'uuid';
import { getDatabase } from '@/infrastructure/database';
import type {
  Product,
  ProductWithTier,
  FrequencyTier,
  CreateProductPayload,
  UpdateProductPayload,
} from '@/types';

const FREQUENCY_WINDOW = 100;
const FREQUENT_THRESHOLD = 80;
const SELDOM_THRESHOLD = 20;

// ─────────────────────────────────────────────────────────────
// Frequency Tier Calculation
// ─────────────────────────────────────────────────────────────

async function computeFrequencyTier(
  productId: string,
  totalSaleCount: number
): Promise<FrequencyTier> {
  // Cold start: not enough data yet.
  if (totalSaleCount < FREQUENCY_WINDOW) return 'NORMAL';

  const db = await getDatabase();
  const result = await db.getFirstAsync<{ appearances: number }>(
    `SELECT COUNT(DISTINCT si.saleId) AS appearances
     FROM saleItems si
     WHERE si.productId = ?
       AND si.saleId IN (
         SELECT id FROM sales ORDER BY confirmedAt DESC LIMIT ?
       )`,
    [productId, FREQUENCY_WINDOW]
  );

  const appearances = result?.appearances ?? 0;

  if (appearances > FREQUENT_THRESHOLD) return 'FREQUENT';
  if (appearances < SELDOM_THRESHOLD) return 'SELDOM';
  return 'NORMAL';
}

// ─────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────

export async function getAllProducts(): Promise<ProductWithTier[]> {
  const db = await getDatabase();

  const products = await db.getAllAsync<Product>(
    'SELECT * FROM products ORDER BY name ASC'
  );

  const countResult = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM sales'
  );
  const totalSaleCount = countResult?.count ?? 0;

  const withTiers = await Promise.all(
    products.map(async (p) => ({
      ...p,
      frequencyTier: await computeFrequencyTier(p.id, totalSaleCount),
    }))
  );

  // Sort: Frequent → Normal → Seldom, then alphabetical within tier.
  const tierOrder: Record<FrequencyTier, number> = {
    FREQUENT: 0,
    NORMAL: 1,
    SELDOM: 2,
  };

  return withTiers.sort(
    (a, b) =>
      tierOrder[a.frequencyTier] - tierOrder[b.frequencyTier] ||
      a.name.localeCompare(b.name)
  );
}

export async function getProductById(id: string): Promise<Product | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Product>('SELECT * FROM products WHERE id = ?', [id]);
}

// ─────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────

export async function createProduct(payload: CreateProductPayload): Promise<Product> {
  const db = await getDatabase();
  const now = Date.now();
  const product: Product = {
    id: uuid(),
    name: payload.name.trim(),
    price: payload.price,
    iconId: payload.iconId,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO products (id, name, price, iconId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [product.id, product.name, product.price, product.iconId, product.createdAt, product.updatedAt]
  );

  return product;
}

export async function updateProduct(
  id: string,
  payload: UpdateProductPayload
): Promise<Product> {
  const db = await getDatabase();
  const existing = await getProductById(id);
  if (!existing) throw new Error(`Product not found: ${id}`);

  const updated: Product = {
    ...existing,
    ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
    ...(payload.price !== undefined ? { price: payload.price } : {}),
    ...(payload.iconId !== undefined ? { iconId: payload.iconId } : {}),
    updatedAt: Date.now(),
  };

  await db.runAsync(
    `UPDATE products SET name = ?, price = ?, iconId = ?, updatedAt = ? WHERE id = ?`,
    [updated.name, updated.price, updated.iconId, updated.updatedAt, id]
  );

  return updated;
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM products WHERE id = ?', [id]);
}
