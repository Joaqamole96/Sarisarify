import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '$lib/firebase';

const BATCH_SIZE = 400;

async function deleteCollection(name: string): Promise<void> {
	const snap = await getDocs(collection(db, name));
	if (snap.empty) return;
	for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
		const batch = writeBatch(db);
		snap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(doc(db, name, d.id)));
		await batch.commit();
	}
}

export const dataAdmin = {
	async clearSales(): Promise<void> {
		await deleteCollection('sales');
		await deleteCollection('stockAdjustments');
	},
	async clearBorrows(): Promise<void> {
		await deleteCollection('borrows');
		await deleteCollection('borrowPayments');
	}
};