import {
	collection,
	onSnapshot,
	addDoc,
	updateDoc,
	deleteDoc,
	doc,
	serverTimestamp,
	query,
	orderBy,
	increment
} from 'firebase/firestore';
import { db } from '$lib/firebase';
import type { Product, NewProduct, NewStockAdjustment } from '$lib/types';

const COLLECTION     = 'products';
const ADJUSTMENTS_COL = 'stockAdjustments';

function createProductsStore() {
	let list = $state<Product[]>([]);

	const q = query(collection(db, COLLECTION), orderBy('name'));
	onSnapshot(q, (snap) => {
		list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
	});

	return {
		get list() { return list; },

		add(data: NewProduct): void {
			const doc_data: Record<string, unknown> = {
				name:        data.name,
				price:       data.price,
				pricingMode: data.pricingMode ?? 'per_sale',
				...(data.iconKey   ? { iconKey:   data.iconKey }   : {}),
				...(data.iconEmoji ? { iconEmoji: data.iconEmoji } : {}),
				category:   data.category,
				trackStock: data.trackStock ?? true,
				stock:      0,
				createdAt:  serverTimestamp()
			};
			if (data.unitLabel)                    doc_data.unitLabel      = data.unitLabel;
			if (data.depositAmount)                doc_data.depositAmount  = data.depositAmount;
			if (data.discountAmount)               doc_data.discountAmount = data.discountAmount;
			if (data.bundleQuantity !== undefined) doc_data.bundleQuantity = data.bundleQuantity;
			if (data.bundlePrice    !== undefined) doc_data.bundlePrice    = data.bundlePrice;
			addDoc(collection(db, COLLECTION), doc_data);
		},

		update(id: string, data: Partial<NewProduct>): void {
			updateDoc(doc(db, COLLECTION, id), data);
		},

		remove(id: string): void {
			deleteDoc(doc(db, COLLECTION, id));
		},

		// Restock: add N units or set exact count.
		// Fire-and-forget — offline safe.
		restock(product: Product, mode: 'add' | 'set', amount: number): void {
			if (amount <= 0) return;
			const ref       = doc(db, COLLECTION, product.id);
			const stockAfter = mode === 'add' ? product.stock + amount : amount;
			const delta      = mode === 'add' ? amount : amount - product.stock;

			updateDoc(ref, { stock: mode === 'add' ? increment(amount) : amount });

			const adj: NewStockAdjustment = {
				productId:   product.id,
				productName: product.name,
				reason:      mode === 'add' ? 'restock_add' : 'restock_set',
				delta,
				stockAfter
			};
			addDoc(collection(db, ADJUSTMENTS_COL), { ...adj, createdAt: serverTimestamp() });
		},

		// Personal use: deduct stock without a sale record.
		// Fire-and-forget — offline safe.
		personalUse(product: Product, amount: number): void {
			if (amount <= 0) return;
			const ref        = doc(db, COLLECTION, product.id);
			const stockAfter = Math.max(0, product.stock - amount);

			updateDoc(ref, { stock: increment(-amount) });

			const adj: NewStockAdjustment = {
				productId:   product.id,
				productName: product.name,
				reason:      'personal_use',
				delta:       -amount,
				stockAfter,
				note:        'personal use'
			};
			addDoc(collection(db, ADJUSTMENTS_COL), { ...adj, createdAt: serverTimestamp() });
		},

		// Called by sales store on confirm — not for direct UI use.
		decrementStock(productId: string, quantity: number): void {
			updateDoc(doc(db, COLLECTION, productId), { stock: increment(-quantity) });
		}
	};
}

export const products = createProductsStore();