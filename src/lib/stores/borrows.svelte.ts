import {
	collection,
	onSnapshot,
	query,
	where,
	orderBy,
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
	let outstandingBorrows = $state<BorrowRecord[]>([]);

	// Outstanding borrows listener (unpaid + partial). Aggregation is done client-side.
	const q = query(
		collection(db, BORROWS_COL),
		where('status', 'in', ['unpaid', 'partial']),
		orderBy('createdAt', 'desc')
	);
	onSnapshot(q, (snap) => {
		outstandingBorrows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BorrowRecord);
	});

	return {
		get outstandingBorrows() { return outstandingBorrows; },

		// Aggregated outstanding totals per borrower (derived from outstandingBorrows).
		get borrowerBalances(): BorrowerBalanceRow[] {
			const map = new Map<string, BorrowerBalanceRow>();
			for (const b of outstandingBorrows) {
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
			const q = query(
				collection(db, BORROWS_COL),
				where('borrowerId', '==', borrowerId),
				orderBy('createdAt', 'desc')
			);
			return onSnapshot(q, (snap) => {
				onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BorrowRecord));
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

