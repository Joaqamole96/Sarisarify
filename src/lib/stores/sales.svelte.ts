import {
	collection,
	addDoc,
	serverTimestamp,
	writeBatch,
	doc
} from 'firebase/firestore';
import { db } from '$lib/firebase';
import type { Product, SaleLineItem } from '$lib/types';
import { products } from '$lib/stores/products.svelte.ts';

// ---------------------------------------------------------------------------
// Cart item — in-memory only, never persisted until confirmed
// ---------------------------------------------------------------------------

export interface CartItem {
	product: Product;
	quantity: number;
	unitPrice: number;      // for 'open': operator-entered price; for others: product.price
	depositApplied: boolean;
	discountApplied: boolean;
}

// ---------------------------------------------------------------------------
// Line total calculation — single source of truth for all pricing modes
// ---------------------------------------------------------------------------

export function calcLineTotal(item: CartItem): number {
	const { product, quantity, unitPrice, depositApplied, discountApplied } = item;

	let base: number;
	if (product.pricingMode === 'per_sale') {
		// per_sale: always ceiling rounding for individual items
		base = Math.ceil(unitPrice * quantity);
	} else if (product.pricingMode === 'per_bundle' && product.bundleQuantity && product.bundlePrice) {
		// per_bundle: apply bundle pricing when quantity reaches bundle size
		const bundleQty = product.bundleQuantity;
		const bundlePrice = product.bundlePrice;
		const bundles = Math.floor(quantity / bundleQty);
		const remainder = quantity % bundleQty;
		base = bundles * bundlePrice + Math.ceil(remainder * unitPrice);
	} else if (product.pricingMode === 'open') {
		// open: price is entered by operator, no rounding
		base = unitPrice * quantity;
	} else {
		// fallback (should not happen)
		base = unitPrice * quantity;
	}

	const deposit  = depositApplied  ? (product.depositAmount  ?? 0) * quantity : 0;
	const discount = discountApplied ? (product.discountAmount ?? 0) * quantity : 0;

	return base + deposit - discount;
}

// ---------------------------------------------------------------------------
// Firestore collection names
// ---------------------------------------------------------------------------

const SALES_COL   = 'sales';
const BORROWS_COL = 'borrows';

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

function createSalesStore() {
	let cart = $state<CartItem[]>([]);

	function findIndex(productId: string, unitPrice: number): number {
		return cart.findIndex(
			(item) => item.product.id === productId && item.unitPrice === unitPrice
		);
	}

	return {
		get cart() { return cart; },

		get total(): number {
			return cart.reduce((sum, item) => sum + calcLineTotal(item), 0);
		},

		get itemCount(): number {
			return cart.reduce((sum, item) => sum + item.quantity, 0);
		},

		addProduct(product: Product, unitPrice: number): void {
			const idx = findIndex(product.id, unitPrice);
			if (idx >= 0) {
				cart[idx] = { ...cart[idx], quantity: cart[idx].quantity + 1 };
			} else {
				cart = [
					...cart,
					{ product, quantity: 1, unitPrice, depositApplied: false, discountApplied: false }
				];
			}
		},

		removeOne(productId: string, unitPrice: number): void {
			const idx = findIndex(productId, unitPrice);
			if (idx < 0) return;
			if (cart[idx].quantity <= 1) {
				cart = cart.filter((_, i) => i !== idx);
			} else {
				cart[idx] = { ...cart[idx], quantity: cart[idx].quantity - 1 };
			}
		},

		toggleDeposit(productId: string, unitPrice: number): void {
			const idx = findIndex(productId, unitPrice);
			if (idx < 0) return;
			cart[idx] = { ...cart[idx], depositApplied: !cart[idx].depositApplied };
		},

		toggleDiscount(productId: string, unitPrice: number): void {
			const idx = findIndex(productId, unitPrice);
			if (idx < 0) return;
			cart[idx] = { ...cart[idx], discountApplied: !cart[idx].discountApplied };
		},

		// Confirm the sale.
		// OFFLINE-FIRST: cart is reset immediately before the Firestore write.
		// The write is fired without awaiting — Firestore's persistent cache queues it
		// and syncs when connectivity returns. The UI never blocks on network.

		confirm(params: {
			cashCollected: number;
			borrowerId?: string;
			borrowerName?: string;
			note?: string;
		}): void {
			const total        = cart.reduce((sum, item) => sum + calcLineTotal(item), 0);
			const borrowAmount = total - params.cashCollected;

			const items: SaleLineItem[] = cart.map((item) => ({
				productId:       item.product.id,
				productName:     item.product.name,
				...(item.product.iconKey ? { productIconKey: item.product.iconKey } : {}),
				...(item.product.iconEmoji ? { productEmoji: item.product.iconEmoji } : {}),
				pricingMode:     item.product.pricingMode,
				quantity:        item.quantity,
				unitPrice:       item.unitPrice,
				lineTotal:       calcLineTotal(item),
				depositApplied:  item.depositApplied,
				depositAmount:   item.product.depositAmount  ?? 0,
				discountApplied: item.discountApplied,
				discountAmount:  item.product.discountAmount ?? 0
			}));

			const saleData: Record<string, unknown> = {
				items,
				total,
				cashCollected: params.cashCollected,
				borrowAmount,
				createdAt: serverTimestamp()
			};
			if (params.borrowerId)   saleData.borrowerId   = params.borrowerId;
			if (params.borrowerName) saleData.borrowerName = params.borrowerName;
			if (params.note)         saleData.note         = params.note;

			const cartSnapshot = [...cart];

			// Reset cart immediately — do not wait for Firestore
			cart = [];

			// Decrement stock for all tracked products — fire-and-forget
			for (const item of items) {
				const p = cartSnapshot.find((c) => c.product.id === item.productId)?.product;
				if (p?.trackStock) {
					products.decrementStock(p.id, item.quantity);
				}
			}

			// Fire-and-forget write — Firestore handles offline queuing
			if (borrowAmount > 0 && params.borrowerId) {
				const batch     = writeBatch(db);
				const saleRef   = doc(collection(db, SALES_COL));
				const borrowRef = doc(collection(db, BORROWS_COL));

				batch.set(saleRef, saleData);
				batch.set(borrowRef, {
					saleId:          saleRef.id,
					borrowerId:      params.borrowerId,
					borrowerName:    params.borrowerName,
					originalAmount:  borrowAmount,
					remainingAmount: borrowAmount,
					status:          'unpaid',
					createdAt:       serverTimestamp(),
					...(params.note ? { note: params.note } : {})
				});

				batch.commit();
			} else {
				addDoc(collection(db, SALES_COL), saleData);
			}
		},

		reset(): void {
			cart = [];
		}
	};
}

export const sales = createSalesStore();