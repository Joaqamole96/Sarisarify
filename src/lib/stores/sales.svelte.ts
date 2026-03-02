import {
	collection,
	addDoc,
	serverTimestamp,
	writeBatch,
	doc
} from 'firebase/firestore';
import { db } from '$lib/firebase';
import type { Product, SaleLineItem } from '$lib/types';

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
	if (product.pricingMode === 'per_unit') {
		base = Math.ceil(unitPrice * quantity);
	} else {
		// 'fixed' or 'open' — both are whole-peso amounts multiplied by quantity
		base = unitPrice * quantity;
	}

	// Deposit is per-line (not per-unit): one bottle returned = one deposit
	const deposit  = depositApplied  ? (product.depositAmount  ?? 0)            : 0;
	// Discount is per-unit: if discountAmount is ₱2 and qty is 3, total discount = ₱6
	const discount = discountApplied ? (product.discountAmount ?? 0) * quantity  : 0;

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

	// Identify a cart line by product id + unitPrice.
	// open-priced products with different prices are separate lines.
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

		// Add or increment a product line.
		// For open-priced products, each distinct unitPrice is a separate line.
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

		// Decrement by one; removes line when quantity reaches 0.
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

		// Persist the sale to Firestore and reset the session.
		// If borrowAmount > 0 and a borrower is provided, a borrow record is written
		// atomically in the same batch as the sale.
		async confirm(params: {
			cashCollected: number;
			borrowerId?: string;
			borrowerName?: string;
			note?: string;
		}): Promise<void> {
			const total        = cart.reduce((sum, item) => sum + calcLineTotal(item), 0);
			const borrowAmount = total - params.cashCollected;

			const items: SaleLineItem[] = cart.map((item) => ({
				productId:       item.product.id,
				productName:     item.product.name,
				productEmoji:    item.product.iconEmoji,
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

			if (borrowAmount > 0 && params.borrowerId) {
				// Atomic write: sale + borrow record in one batch
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

				await batch.commit();
			} else {
				await addDoc(collection(db, SALES_COL), saleData);
			}

			// Immediate reset — no summary screen, ready for next customer
			cart = [];
		},

		reset(): void {
			cart = [];
		}
	};
}

// Singleton — one session for the entire app lifetime.
export const sales = createSalesStore();