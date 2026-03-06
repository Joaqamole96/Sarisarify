import {
	collection,
	onSnapshot,
	addDoc,
	updateDoc,
	deleteDoc,
	serverTimestamp,
	query,
	orderBy,
	getDocs,
	where,
	doc
} from 'firebase/firestore';
import { db } from '$lib/firebase';
import type { Borrower, NewBorrower } from '$lib/types';

const BORROWERS_COL = 'borrowers';
const BORROWS_COL   = 'borrows';

function createBorrowersStore() {
	let list = $state<Borrower[]>([]);

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

		async rename(id: string, newName: string): Promise<void> {
			const name = newName.trim();
			if (!name) return;
			await updateDoc(doc(db, BORROWERS_COL, id), { name });
		},

		async remove(id: string): Promise<void> {
			await deleteDoc(doc(db, BORROWERS_COL, id));
		},

		async hasOutstandingBalance(borrowerId: string): Promise<boolean> {
			const q = query(
				collection(db, BORROWS_COL),
				where('borrowerId', '==', borrowerId),
				where('status', 'in', ['unpaid', 'partial'])
			);
			const snap = await getDocs(q);
			return !snap.empty;
		},

		async outstandingTotal(borrowerId: string): Promise<number> {
			const q = query(
				collection(db, BORROWS_COL),
				where('borrowerId', '==', borrowerId),
				where('status', 'in', ['unpaid', 'partial'])
			);
			const snap = await getDocs(q);
			return snap.docs.reduce((sum, d) => sum + (d.data().remainingAmount ?? 0), 0);
		}
	};
}

export const borrowers = createBorrowersStore();