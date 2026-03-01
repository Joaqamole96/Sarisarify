import {
	collection,
	onSnapshot,
	addDoc,
	updateDoc,
	deleteDoc,
	doc,
	serverTimestamp,
	query,
	orderBy
} from 'firebase/firestore';
import { db } from '$lib/firebase';
import { DEFAULT_ICON } from '$lib/icons';
import type { Product, NewProduct } from '$lib/types';

// The Firestore collection name — defined once here, never as a raw string elsewhere.
const COLLECTION = 'products';

function createProductsStore() {
	let list = $state<Product[]>([]);

	// Real-time listener — sorted alphabetically by name.
	// Firestore's persistentLocalCache (enabled in Sprint 0) means this resolves
	// instantly from disk — no network round-trip required.
	const q = query(collection(db, COLLECTION), orderBy('name'));

	onSnapshot(q, (snap) => {
		list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
	});

	return {
		get list() {
			return list;
		},

		// Add a new product.
		// `stock` defaults to 0; `createdAt` is set by the server.
		// `pricingMode` defaults to 'fixed'; `trackStock` defaults to true.
		// Optional fields (unitLabel, depositAmount, discountAmount) are only written
		// if present — Firestore documents should not store undefined fields.
		async add(data: NewProduct): Promise<void> {
			const doc_data: Record<string, unknown> = {
				name: data.name,
				price: data.price,
				pricingMode: data.pricingMode ?? 'fixed',
				iconEmoji: data.iconEmoji ?? DEFAULT_ICON,
				trackStock: data.trackStock ?? true,
				stock: 0,
				createdAt: serverTimestamp()
			};
			if (data.unitLabel)      doc_data.unitLabel      = data.unitLabel;
			if (data.depositAmount)  doc_data.depositAmount  = data.depositAmount;
			if (data.discountAmount) doc_data.discountAmount = data.discountAmount;
			await addDoc(collection(db, COLLECTION), doc_data);
		},

		// Update only the fields that changed.
		// `id`, `stock`, and `createdAt` are never updated through this path —
		// stock changes go through the Sales (Sprint 2) and Inventory (Sprint 5) flows.
		async update(id: string, data: Partial<NewProduct>): Promise<void> {
			await updateDoc(doc(db, COLLECTION, id), data);
		},

		// Hard delete — no soft delete in v1.
		async remove(id: string): Promise<void> {
			await deleteDoc(doc(db, COLLECTION, id));
		}
	};
}

// Singleton — one listener for the entire app lifetime.
export const products = createProductsStore();