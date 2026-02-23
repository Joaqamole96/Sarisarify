import { v4 as uuid } from 'uuid';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '@/infrastructure/database';
import type {
  Borrower,
  Borrow,
  BorrowPayment,
  BorrowWithDetails,
  ActiveSaleItem,
} from '@/types';

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

/** Find or create a Borrower by name (case-insensitive). */
async function findOrCreateBorrower(
  db: SQLiteDatabase,
  name: string,
  now: number
): Promise<Borrower> {
  const normalized = name.trim();

  const existing = await db.getFirstAsync<Borrower>(
    'SELECT * FROM borrowers WHERE name = ? COLLATE NOCASE',
    [normalized]
  );
  if (existing) return existing;

  const borrower: Borrower = { id: uuid(), name: normalized, createdAt: now };
  await db.runAsync(
    'INSERT INTO borrowers (id, name, createdAt) VALUES (?, ?, ?)',
    [borrower.id, borrower.name, borrower.createdAt]
  );
  return borrower;
}

// ─────────────────────────────────────────────────────────────
// Called from saleRepository inside its transaction
// ─────────────────────────────────────────────────────────────

export async function createBorrowForSale(
  db: SQLiteDatabase,
  saleId: string,
  borrowerName: string,
  items: ActiveSaleItem[],
  now: number
): Promise<Borrow> {
  const borrower = await findOrCreateBorrower(db, borrowerName, now);

  const borrowedItems = items.filter((i) => i.isBorrowed);
  if (borrowedItems.length === 0) {
    throw new Error('createBorrowForSale called but no items are marked as borrowed');
  }

  const totalAmount = borrowedItems.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0
  );

  const borrow: Borrow = {
    id: uuid(),
    borrowerId: borrower.id,
    saleId,
    totalAmount,
    outstandingBalance: totalAmount,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO borrows
       (id, borrowerId, saleId, totalAmount, outstandingBalance, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      borrow.id,
      borrow.borrowerId,
      borrow.saleId,
      borrow.totalAmount,
      borrow.outstandingBalance,
      borrow.status,
      borrow.createdAt,
      borrow.updatedAt,
    ]
  );

  return borrow;
}

// ─────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────

export async function getAllBorrowers(): Promise<Borrower[]> {
  const db = await getDatabase();
  return db.getAllAsync<Borrower>('SELECT * FROM borrowers ORDER BY name ASC');
}

export async function getActiveBorrowsForBorrower(
  borrowerId: string
): Promise<BorrowWithDetails[]> {
  const db = await getDatabase();
  const borrows = await db.getAllAsync<Borrow>(
    `SELECT * FROM borrows WHERE borrowerId = ? ORDER BY createdAt DESC`,
    [borrowerId]
  );
  return Promise.all(borrows.map((b) => enrichBorrowWithDetails(b)));
}

export async function getBorrowById(id: string): Promise<BorrowWithDetails | null> {
  const db = await getDatabase();
  const borrow = await db.getFirstAsync<Borrow>(
    'SELECT * FROM borrows WHERE id = ?',
    [id]
  );
  if (!borrow) return null;
  return enrichBorrowWithDetails(borrow);
}

async function enrichBorrowWithDetails(borrow: Borrow): Promise<BorrowWithDetails> {
  const db = await getDatabase();

  const borrower = await db.getFirstAsync<Borrower>(
    'SELECT * FROM borrowers WHERE id = ?',
    [borrow.borrowerId]
  );
  if (!borrower) throw new Error(`Borrower not found: ${borrow.borrowerId}`);

  const payments = await db.getAllAsync<BorrowPayment>(
    'SELECT * FROM borrowPayments WHERE borrowId = ? ORDER BY paidAt ASC',
    [borrow.id]
  );

  // Lazy-import to avoid circular dependency with saleRepository
  const { getSaleById } = await import('./saleRepository');
  const sale = await getSaleById(borrow.saleId);
  if (!sale) throw new Error(`Sale not found: ${borrow.saleId}`);

  return { ...borrow, borrower, sale, payments };
}

// ─────────────────────────────────────────────────────────────
// Record a Payment
// ─────────────────────────────────────────────────────────────

export async function recordPayment(
  borrowId: string,
  amount: number
): Promise<{ borrow: Borrow; payment: BorrowPayment }> {
  const db = await getDatabase();

  const borrow = await db.getFirstAsync<Borrow>(
    'SELECT * FROM borrows WHERE id = ?',
    [borrowId]
  );
  if (!borrow) throw new Error(`Borrow not found: ${borrowId}`);
  if (borrow.status === 'RESOLVED') throw new Error(`Borrow is already resolved`);
  if (amount > borrow.outstandingBalance) {
    throw new Error(
      `Payment amount (${amount}) exceeds outstanding balance (${borrow.outstandingBalance})`
    );
  }

  const now = Date.now();
  const payment: BorrowPayment = {
    id: uuid(),
    borrowId,
    amount,
    paidAt: now,
  };

  const newBalance = Number(
    (borrow.outstandingBalance - amount).toFixed(2)
  );
  const newStatus = newBalance === 0 ? 'RESOLVED' : 'ACTIVE';

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO borrowPayments (id, borrowId, amount, paidAt) VALUES (?, ?, ?, ?)',
      [payment.id, payment.borrowId, payment.amount, payment.paidAt]
    );
    await db.runAsync(
      'UPDATE borrows SET outstandingBalance = ?, status = ?, updatedAt = ? WHERE id = ?',
      [newBalance, newStatus, now, borrowId]
    );
  });

  const updatedBorrow: Borrow = {
    ...borrow,
    outstandingBalance: newBalance,
    status: newStatus,
    updatedAt: now,
  };

  return { borrow: updatedBorrow, payment };
}
