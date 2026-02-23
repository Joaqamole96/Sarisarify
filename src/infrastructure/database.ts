import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

const SCHEMA_V1 = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS products (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    price     REAL NOT NULL CHECK (price >= 0),
    iconId    TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sales (
    id            TEXT PRIMARY KEY,
    paymentMethod TEXT NOT NULL CHECK (paymentMethod IN ('CASH', 'BORROW', 'PARTIAL')),
    confirmedAt   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS saleItems (
    id          TEXT    PRIMARY KEY,
    saleId      TEXT    NOT NULL REFERENCES sales(id),
    productId   TEXT    NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL CHECK (quantity >= 1),
    priceAtSale REAL    NOT NULL CHECK (priceAtSale >= 0),
    isBorrowed  INTEGER NOT NULL DEFAULT 0 CHECK (isBorrowed IN (0, 1))
  );

  CREATE TABLE IF NOT EXISTS borrowers (
    id        TEXT    PRIMARY KEY,
    name      TEXT    NOT NULL COLLATE NOCASE,
    createdAt INTEGER NOT NULL,
    UNIQUE (name)
  );

  CREATE TABLE IF NOT EXISTS borrows (
    id                 TEXT    PRIMARY KEY,
    borrowerId         TEXT    NOT NULL REFERENCES borrowers(id),
    saleId             TEXT    NOT NULL UNIQUE REFERENCES sales(id),
    totalAmount        REAL    NOT NULL CHECK (totalAmount > 0),
    outstandingBalance REAL    NOT NULL CHECK (outstandingBalance >= 0),
    status             TEXT    NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED')),
    createdAt          INTEGER NOT NULL,
    updatedAt          INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS borrowPayments (
    id       TEXT    PRIMARY KEY,
    borrowId TEXT    NOT NULL REFERENCES borrows(id),
    amount   REAL    NOT NULL CHECK (amount > 0),
    paidAt   INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sales_confirmedAt
    ON sales (confirmedAt DESC);

  CREATE INDEX IF NOT EXISTS idx_saleItems_productId
    ON saleItems (productId);

  CREATE INDEX IF NOT EXISTS idx_saleItems_saleId
    ON saleItems (saleId);

  CREATE INDEX IF NOT EXISTS idx_borrows_borrowerId
    ON borrows (borrowerId);

  CREATE INDEX IF NOT EXISTS idx_borrowPayments_borrowId
    ON borrowPayments (borrowId);
`;

async function migrate(database: SQLite.SQLiteDatabase): Promise<void> {
  const result = await database.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const version = result?.user_version ?? 0;

  if (version < 1) {
    await database.execAsync(SCHEMA_V1);
    await database.execAsync('PRAGMA user_version = 1');
  }

  // Future migrations:
  // if (version < 2) { ... await database.execAsync('PRAGMA user_version = 2'); }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('tindahan.db');

  // Enable foreign keys on every connection — SQLite disables them by default.
  await db.execAsync('PRAGMA foreign_keys = ON');

  await migrate(db);

  return db;
}
