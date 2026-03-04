import {
	collection,
	onSnapshot,
	query,
	orderBy,
	limit,
	doc,
	getDoc,
	updateDoc
} from 'firebase/firestore';
import { db } from '$lib/firebase';
import type { Sale } from '$lib/types';

const SALES_COL = 'sales';

function createSalesHistoryStore() {
	let list = $state<Sale[]>([]);

	const q = query(collection(db, SALES_COL), orderBy('createdAt', 'desc'), limit(200));
	onSnapshot(q, (snap) => {
		list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Sale);
	});

	return {
		get list() { return list; },

		async getById(id: string): Promise<Sale | null> {
			const ref = doc(db, SALES_COL, id);
			const snap = await getDoc(ref);
			if (!snap.exists()) return null;
			return ({ id: snap.id, ...snap.data() }) as Sale;
		},

		async updateNote(id: string, note: string | undefined): Promise<void> {
			const ref = doc(db, SALES_COL, id);
			await updateDoc(ref, { note: note && note.trim().length > 0 ? note.trim() : null });
		}
	};
}

export const salesHistory = createSalesHistoryStore();

