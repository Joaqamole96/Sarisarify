import type { Timestamp } from 'firebase/firestore';

// --- Products ---

// Categories are runtime-managed (Sprint 3 P-8).
// Stored as plain strings on products; default seed list lives in categories store.
export type ProductCategory = string;

export type PricingMode = 'per_sale' | 'per_bundle' | 'open';
// per_sale:   lineTotal = ceil(price × qty) — for individual items, always ceiling rounding
// per_bundle: price per unit and price per bundle (when quantity reaches bundle size)
// open:       price is entered by operator at sale time (e.g. ice bags sold by peso amount)
//             trackStock is locked to false for open-priced products

export interface Product {
	id: string;                  // Firestore document ID — added client-side after read
	name: string;
	price: number;               // unit price in Philippine Peso, always ≥ 0
	                             // for per_bundle: price per unit; ignored when pricingMode === 'open'
	pricingMode: PricingMode;
	unitLabel?: string;          // display only — "pc", "sachet", "stick"
	// iconKey is the preferred icon reference (Sprint 3 D-6).
	// iconEmoji is kept for backwards compatibility with older products.
	iconKey?: string;
	iconEmoji?: string;
	category: ProductCategory;

	// Bundle pricing (only for per_bundle)
	bundleQuantity?: number;     // number of units in a bundle (e.g., 12 for a dozen)
	bundlePrice?: number;        // price for the entire bundle (e.g., 120 for a dozen)

	// Inventory (Sprint 5)
	trackStock: boolean;         // false = excluded from stock tracking and low-stock warnings
	                             // always false for open-priced products
	stock: number;               // current unit count; ignored when trackStock is false

	// Sales behaviour (Sprint 2)
	depositAmount?: number;      // if set, Sales shows a per-item deposit toggle (+₱X)
	                             // not applicable for open-priced products
	discountAmount?: number;     // if set, Sales shows a per-item discount button (-₱X)
	                             // not applicable for open-priced products

	createdAt: Timestamp;        // server timestamp set once on creation, never updated
}

export type NewProduct = Omit<Product, 'id' | 'stock' | 'createdAt'>;

// --- Sales ---

export interface SaleLineItem {
	productId: string;
	productName: string;         // snapshot at time of sale
	productIconKey?: string;     // snapshot (preferred)
	productEmoji?: string;       // snapshot (legacy)
	pricingMode: PricingMode;
	quantity: number;
	unitPrice: number;           // for 'open': operator-entered price; for others: product.price
	lineTotal: number;           // final total after rounding + deposit - discount; stored for querying
	depositApplied: boolean;
	depositAmount: number;       // 0 if product has no deposit
	discountApplied: boolean;
	discountAmount: number;      // 0 if product has no discount
}

export interface Sale {
	id: string;
	items: SaleLineItem[];
	total: number;               // sum of all lineTotals
	cashCollected: number;       // amount handed over at time of sale
	borrowAmount: number;        // total - cashCollected; 0 for fully-paid sales
	borrowerId?: string;         // present when borrowAmount > 0
	borrowerName?: string;       // snapshot; present when borrowAmount > 0
	note?: string;               // optional operator note; editable after the fact
	createdAt: Timestamp;
}

export type NewSale = Omit<Sale, 'id' | 'createdAt'>;

// --- Borrowers ---

export interface Borrower {
	id: string;
	name: string;
	contact?: string;
	createdAt: Timestamp;
}

export type NewBorrower = Omit<Borrower, 'id' | 'createdAt'>;

// --- Borrows ---

export type BorrowStatus = 'unpaid' | 'partial' | 'paid';

export interface BorrowRecord {
	id: string;
	saleId: string;              // reference to the sale that created this borrow
	borrowerId: string;
	borrowerName: string;        // snapshot at time of sale
	originalAmount: number;      // the borrow amount when created
	remainingAmount: number;     // decremented on each partial/full payment
	status: BorrowStatus;
	note?: string;               // optional note; editable
	createdAt: Timestamp;
}

export type NewBorrowRecord = Omit<BorrowRecord, 'id' | 'createdAt'>;

// --- Borrow payments (Sprint 3) ---

export interface BorrowPayment {
	id: string;
	borrowId: string;            // reference to borrows/{borrowId}
	borrowerId: string;
	borrowerName: string;        // snapshot at time of payment
	amount: number;              // payment amount applied to remainingAmount
	note?: string;
	createdAt: Timestamp;
}

export type NewBorrowPayment = Omit<BorrowPayment, 'id' | 'createdAt'>;