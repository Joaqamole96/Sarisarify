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
import type { ProductIconKey } from '$lib/productIcons';

const CATEGORIES_COL = 'categories';
const PRODUCTS_COL = 'products';

export interface Category {
	id: string;
	name: string;
	color: string;
	iconKeys?: ProductIconKey[];
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

const PALETTE = [
	'#ef4444', // red
	'#f97316', // orange
	'#eab308', // yellow
	'#22c55e', // green
	'#06b6d4', // cyan
	'#3b82f6', // blue
	'#8b5cf6', // violet
	'#ec4899', // pink
];

function pickColor(name: string): string {
	let hash = 0;
	for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
	return PALETTE[hash % PALETTE.length];
}

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
		list = snap.docs.map((d) => {
			const data = d.data();
			return {
				id: d.id,
				...data,
				color: data.color ?? pickColor(data.name ?? d.id)
			} as Category;
		});

		if (!seeded && snap.empty) {
			seeded = true;
			const existing = await getDocs(collection(db, CATEGORIES_COL));
			if (!existing.empty) return;

			const batch = writeBatch(db);
			for (const name of DEFAULT_CATEGORIES) {
				const id = normalizeId(name);
				batch.set(doc(db, CATEGORIES_COL, id), {
					name,
					color: pickColor(name),
					createdAt: serverTimestamp()
				});
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
			await setDoc(
				doc(db, CATEGORIES_COL, id),
				{ name, color: pickColor(name), createdAt: serverTimestamp() },
				{ merge: true }
			);
		},

		async rename(oldNameRaw: string, newNameRaw: string): Promise<void> {
			const oldName = oldNameRaw.trim();
			const newName = newNameRaw.trim();
			if (!oldName || !newName || oldName === newName) return;

			const oldId = normalizeId(oldName);
			const newId = normalizeId(newName);

			// Carry over existing color if present, otherwise pick new one
			const existing = list.find((c) => c.id === oldId);
			const color = existing?.color ?? pickColor(newName);

			const batch = writeBatch(db);
			batch.set(
				doc(db, CATEGORIES_COL, newId),
				{ name: newName, color, createdAt: serverTimestamp() },
				{ merge: true }
			);

			const prodSnap = await getDocs(
				query(collection(db, PRODUCTS_COL), where('category', '==', oldName))
			);
			prodSnap.forEach((p) => batch.update(p.ref, { category: newName }));

			batch.delete(doc(db, CATEGORIES_COL, oldId));
			await batch.commit();
		},

		async remove(nameRaw: string): Promise<{ ok: boolean; reason?: string }> {
			const name = nameRaw.trim();
			if (!name) return { ok: false, reason: 'invalid_name' };

			const prodSnap = await getDocs(
				query(collection(db, PRODUCTS_COL), where('category', '==', name))
			);
			if (!prodSnap.empty) return { ok: false, reason: 'in_use' };

			const id = normalizeId(name);
			await deleteDoc(doc(db, CATEGORIES_COL, id));
			return { ok: true };
		},

		async setIconKeys(id: string, iconKeys: ProductIconKey[]): Promise<void> {
			await updateDoc(doc(db, CATEGORIES_COL, id), { iconKeys });
		}
	};
}

export const categories = createCategoriesStore();