import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '@/infrastructure/database';
import { Collections } from '@/infrastructure/firestore';

const LAST_SYNCED_KEY = 'sync:lastSyncedAt';

// ─────────────────────────────────────────────────────────────
// Tables and their sync strategies
// ─────────────────────────────────────────────────────────────

const MUTABLE_TABLES = [
  { name: 'products', collection: Collections.products },
  { name: 'borrowers', collection: Collections.borrowers },
  { name: 'borrows', collection: Collections.borrows },
] as const;

const IMMUTABLE_TABLES = [
  { name: 'sales', collection: Collections.sales },
  { name: 'saleItems', collection: Collections.saleItems },
  { name: 'borrowPayments', collection: Collections.borrowPayments },
] as const;

// ─────────────────────────────────────────────────────────────
// Push (local → Firestore)
// ─────────────────────────────────────────────────────────────

async function pushMutableChanges(lastSyncedAt: number): Promise<void> {
  const db = await getDatabase();

  for (const table of MUTABLE_TABLES) {
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM ${table.name} WHERE updatedAt > ?`,
      [lastSyncedAt]
    );

    for (const row of rows) {
      const id = row.id as string;
      await table.collection().doc(id).set(row, { merge: true });
    }
  }
}

async function pushImmutableChanges(lastSyncedAt: number): Promise<void> {
  const db = await getDatabase();

  // Immutable tables use createdAt instead of updatedAt
  for (const table of IMMUTABLE_TABLES) {
    const timestampCol = table.name === 'saleItems' ? 'rowid' : 'confirmedAt';

    // saleItems don't have a timestamp — use a sync flag approach instead
    if (table.name === 'saleItems') {
      const rows = await db.getAllAsync<Record<string, unknown>>(
        `SELECT si.* FROM saleItems si
         JOIN sales s ON s.id = si.saleId
         WHERE s.confirmedAt > ?`,
        [lastSyncedAt]
      );
      for (const row of rows) {
        await table.collection().doc(row.id as string).set(row);
      }
    } else {
      const col = table.name === 'sales' ? 'confirmedAt' : 'paidAt';
      const rows = await db.getAllAsync<Record<string, unknown>>(
        `SELECT * FROM ${table.name} WHERE ${col} > ?`,
        [lastSyncedAt]
      );
      for (const row of rows) {
        await table.collection().doc(row.id as string).set(row);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Pull (Firestore → local)
// ─────────────────────────────────────────────────────────────

async function pullChanges(lastSyncedAt: number): Promise<void> {
  const db = await getDatabase();

  // Pull mutable tables that may have been updated on another device
  for (const table of MUTABLE_TABLES) {
    const snapshot = await table
      .collection()
      .where('updatedAt', '>', lastSyncedAt)
      .get();

    for (const doc of snapshot.docs) {
      const data = doc.data() as Record<string, unknown>;

      // Upsert: insert or replace based on id
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);

      await db.runAsync(
        `INSERT OR REPLACE INTO ${table.name} (${columns}) VALUES (${placeholders})`,
        values
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Public API — called by app lifecycle handlers
// ─────────────────────────────────────────────────────────────

/**
 * Push all local changes to Firestore.
 * Called when the app is backgrounded (AppState → 'background').
 * Silent — no UI feedback. Failures are retried on next background event.
 */
export async function syncOnBackground(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LAST_SYNCED_KEY);
    const lastSyncedAt = stored ? parseInt(stored, 10) : 0;

    await pushMutableChanges(lastSyncedAt);
    await pushImmutableChanges(lastSyncedAt);

    await AsyncStorage.setItem(LAST_SYNCED_KEY, String(Date.now()));
  } catch {
    // Silent failure — will retry on next background event
  }
}

/**
 * Pull remote changes from Firestore into local SQLite.
 * Called when the app comes to the foreground (AppState → 'active').
 */
export async function syncOnForeground(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LAST_SYNCED_KEY);
    const lastSyncedAt = stored ? parseInt(stored, 10) : 0;

    await pullChanges(lastSyncedAt);
  } catch {
    // Silent failure
  }
}
