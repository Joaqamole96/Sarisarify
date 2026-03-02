import {
	collection,
	onSnapshot,
	addDoc,
	serverTimestamp,
	query,
	orderBy,
	getDocs,
	where
} from 'firebase/firestore';
import { db } from '$lib/firebase';
import type { Borrower, NewBorrower } from '$lib/types';

const BORROWERS_COL = 'borrowers';
const BORROWS_COL   = 'borrows';

function createBorrowersStore() {
	let list = $state<Borrower[]>([]);

	// Real-time listener sorted alphabetically — same pattern as products store.
	const q = query(collection(db, BORROWERS_COL), orderBy('name'));
	onSnapshot(q, (snap) => {
		list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Borrower);
	});

	return {
		get list() { return list; },

		async add(data: NewBorrower): Promise<string> {
			const docData: Record<string, unknown> = {
				name:      data.name,
				createdAt: serverTimestamp()
			};
			if (data.contact) docData.contact = data.contact;
			const ref = await addDoc(collection(db, BORROWERS_COL), docData);
			return ref.id;
		},

		// Returns true if this borrower has at least one unpaid or partial borrow.
		// Used to show the outstanding balance warning during sale confirmation.
		async hasOutstandingBalance(borrowerId: string): Promise<boolean> {
			const q = query(
				collection(db, BORROWS_COL),
				where('borrowerId', '==', borrowerId),
				where('status', 'in', ['unpaid', 'partial'])
			);
			const snap = await getDocs(q);
			return !snap.empty;
		}
	};
}

// Singleton — one listener for the entire app lifetime.
export const borrowers = createBorrowersStore();