import {
	collection,
	onSnapshot,
	query,
	orderBy,
	limit,
	writeBatch,
	doc,
	serverTimestamp
} from 'firebase/firestore';
import { db } from '$lib/firebase';
import type { BorrowRecord } from '$lib/types';

const BORROWS_COL = 'borrows';
const PAYMENTS_COL = 'borrowPayments';

export interface BorrowerBalanceRow {
	borrowerId: string;
	borrowerName: string;
	outstanding: number;
}

function createBorrowsStore() {
	let allBorrows = $state<BorrowRecord[]>([]);

	// Resilient listener: avoid composite index + avoid missing-field issues.
	// We subscribe to recent borrows and compute "outstanding" client-side.
	const q = query(collection(db, BORROWS_COL), orderBy('createdAt', 'desc'), limit(500));
	onSnapshot(q, (snap) => {
		allBorrows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BorrowRecord);
	});

	function outstandingFromAll(): BorrowRecord[] {
		return allBorrows.filter((b) => {
			const remaining = Number(b.remainingAmount ?? 0);
			const status = (b.status ?? 'unpaid') as BorrowRecord['status'];
			// Treat any positive remaining as outstanding unless explicitly paid.
			return remaining > 0 && status !== 'paid';
		});
	}

	return {
		get allBorrows() { return allBorrows; },

		get outstandingBorrows() {
			return outstandingFromAll();
		},

		// Aggregated outstanding totals per borrower (derived from outstandingBorrows).
		get borrowerBalances(): BorrowerBalanceRow[] {
			const map = new Map<string, BorrowerBalanceRow>();
			for (const b of outstandingFromAll()) {
				const existing = map.get(b.borrowerId);
				if (existing) {
					existing.outstanding += b.remainingAmount ?? 0;
				} else {
					map.set(b.borrowerId, {
						borrowerId: b.borrowerId,
						borrowerName: b.borrowerName,
						outstanding: b.remainingAmount ?? 0
					});
				}
			}
			return Array.from(map.values()).sort((a, b) => b.outstanding - a.outstanding);
		},

		listenBorrowerBorrows(
			borrowerId: string,
			onUpdate: (rows: BorrowRecord[]) => void
		): () => void {
			// Subscribe to recent borrows and filter/sort client-side (no composite index required).
			const q = query(collection(db, BORROWS_COL), orderBy('createdAt', 'desc'), limit(500));
			return onSnapshot(q, (snap) => {
				const rows = snap.docs
					.map((d) => ({ id: d.id, ...d.data() }) as BorrowRecord)
					.filter((b) => b.borrowerId === borrowerId)
					.sort((a, b) => {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						const ad = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : 0;
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						const bd = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : 0;
						return bd - ad;
					});
				onUpdate(rows);
			});
		},

		// Records a payment against a specific borrow record (partial/full).
		// OFFLINE-FIRST: uses a batch; Firestore local cache queues it when offline.
		async recordPayment(params: {
			borrowId: string;
			borrowerId: string;
			borrowerName: string;
			currentRemainingAmount: number;
			amount: number;
			note?: string;
		}): Promise<void> {
			const payment = Math.max(0, params.amount);
			const currentRemaining = Math.max(0, params.currentRemainingAmount);
			const nextRemaining = Math.max(0, currentRemaining - payment);
			const nextStatus = nextRemaining <= 0 ? 'paid' : 'partial';

			const batch = writeBatch(db);
			const borrowRef = doc(db, BORROWS_COL, params.borrowId);
			const paymentRef = doc(collection(db, PAYMENTS_COL));

			batch.update(borrowRef, {
				remainingAmount: nextRemaining,
				status: nextStatus,
				updatedAt: serverTimestamp()
			});

			batch.set(paymentRef, {
				borrowId: params.borrowId,
				borrowerId: params.borrowerId,
				borrowerName: params.borrowerName,
				amount: payment,
				createdAt: serverTimestamp(),
				...(params.note ? { note: params.note } : {})
			});

			await batch.commit();
		}
	};
}

export const borrows = createBorrowsStore();

