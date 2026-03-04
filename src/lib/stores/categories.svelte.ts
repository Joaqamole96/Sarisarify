import {
	collection,
	onSnapshot,
	query,
	orderBy,
	setDoc,
	doc,
	serverTimestamp,
	getDocs,
	where,
	writeBatch,
	deleteDoc,
	updateDoc
} from 'firebase/firestore';
import { db } from '$lib/firebase';

const CATEGORIES_COL = 'categories';
const PRODUCTS_COL = 'products';

export interface Category {
	id: string;
	name: string;
	createdAt?: unknown;
}

export const DEFAULT_CATEGORIES: readonly string[] = [
	'Smokes',
	'Snacks',
	'Drinks',
	'Instant Drinks',
	'Alcohol',
	'Food',
	'Toiletries',
	'Load'
] as const;

function normalizeId(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

function createCategoriesStore() {
	let list = $state<Category[]>([]);
	let seeded = false;

	const q = query(collection(db, CATEGORIES_COL), orderBy('name'));
	onSnapshot(q, async (snap) => {
		list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);

		// Seed defaults once when the collection is empty.
		if (!seeded && snap.empty) {
			seeded = true;
			const existing = await getDocs(collection(db, CATEGORIES_COL));
			if (!existing.empty) return;

			const batch = writeBatch(db);
			for (const name of DEFAULT_CATEGORIES) {
				const id = normalizeId(name);
				batch.set(doc(db, CATEGORIES_COL, id), { name, createdAt: serverTimestamp() });
			}
			await batch.commit();
		}
	});

	return {
		get list() { return list; },

		async add(nameRaw: string): Promise<void> {
			const name = nameRaw.trim();
			if (!name) return;
			const id = normalizeId(name);
			await setDoc(doc(db, CATEGORIES_COL, id), { name, createdAt: serverTimestamp() }, { merge: true });
		},

		async rename(oldNameRaw: string, newNameRaw: string): Promise<void> {
			const oldName = oldNameRaw.trim();
			const newName = newNameRaw.trim();
			if (!oldName || !newName || oldName === newName) return;

			const oldId = normalizeId(oldName);
			const newId = normalizeId(newName);

			// Update products referencing the old category name, and migrate the category doc.
			const batch = writeBatch(db);

			// Create/overwrite new category doc
			batch.set(doc(db, CATEGORIES_COL, newId), { name: newName, createdAt: serverTimestamp() }, { merge: true });

			// Update products category field
			const prodSnap = await getDocs(query(collection(db, PRODUCTS_COL), where('category', '==', oldName)));
			prodSnap.forEach((p) => batch.update(p.ref, { category: newName }));

			// Delete old category doc (best-effort)
			batch.delete(doc(db, CATEGORIES_COL, oldId));

			await batch.commit();
		},

		async remove(nameRaw: string): Promise<{ ok: boolean; reason?: string }> {
			const name = nameRaw.trim();
			if (!name) return { ok: false, reason: 'invalid_name' };

			// Block deletion if any product uses the category
			const prodSnap = await getDocs(query(collection(db, PRODUCTS_COL), where('category', '==', name)));
			if (!prodSnap.empty) return { ok: false, reason: 'in_use' };

			const id = normalizeId(name);
			await deleteDoc(doc(db, CATEGORIES_COL, id));
			return { ok: true };
		},

		async updateNameById(id: string, nameRaw: string): Promise<void> {
			const name = nameRaw.trim();
			if (!name) return;
			await updateDoc(doc(db, CATEGORIES_COL, id), { name });
		}
	};
}

export const categories = createCategoriesStore();

