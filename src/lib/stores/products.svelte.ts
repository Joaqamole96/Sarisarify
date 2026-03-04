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
import type { Product, NewProduct } from '$lib/types';

const COLLECTION = 'products';

function createProductsStore() {
	let list = $state<Product[]>([]);

	const q = query(collection(db, COLLECTION), orderBy('name'));
	onSnapshot(q, (snap) => {
		list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
	});

	return {
		get list() { return list; },

		async add(data: NewProduct): Promise<void> {
			const doc_data: Record<string, unknown> = {
				name:        data.name,
				price:       data.price,
				pricingMode: data.pricingMode ?? 'per_sale',
				...(data.iconKey ? { iconKey: data.iconKey } : {}),
				...(data.iconEmoji ? { iconEmoji: data.iconEmoji } : {}),
				category:    data.category,
				trackStock:  data.trackStock  ?? true,
				stock:       0,
				createdAt:   serverTimestamp()
			};
			if (data.unitLabel)      doc_data.unitLabel      = data.unitLabel;
			if (data.depositAmount)  doc_data.depositAmount  = data.depositAmount;
			if (data.discountAmount) doc_data.discountAmount = data.discountAmount;
			if (data.bundleQuantity !== undefined) doc_data.bundleQuantity = data.bundleQuantity;
			if (data.bundlePrice !== undefined) doc_data.bundlePrice = data.bundlePrice;
			await addDoc(collection(db, COLLECTION), doc_data);
		},

		async update(id: string, data: Partial<NewProduct>): Promise<void> {
			await updateDoc(doc(db, COLLECTION, id), data);
		},

		async remove(id: string): Promise<void> {
			await deleteDoc(doc(db, COLLECTION, id));
		}
	};
}

export const products = createProductsStore();