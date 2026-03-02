import type { Timestamp } from 'firebase/firestore';

// --- Products ---

export const PRODUCT_CATEGORIES = [
	'Smokes',
	'Snacks',
	'Drinks',
	'Instant Drinks',
	'Alcohol',
	'Food',
	'Toiletries',
	'Load'
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

export type PricingMode = 'fixed' | 'per_unit' | 'open';
// fixed:    lineTotal = price × qty
// per_unit: lineTotal = ceil(price × qty)  — for fractional unit prices (e.g. candy ₱1.25/pc)
// open:     price is entered by operator at sale time (e.g. ice bags sold by peso amount)
//           trackStock is locked to false for open-priced products

export interface Product {
	id: string;                  // Firestore document ID — added client-side after read
	name: string;
	price: number;               // unit price in Philippine Peso, always ≥ 0
	                             // ignored when pricingMode === 'open'
	pricingMode: PricingMode;
	unitLabel?: string;          // display only — "pc", "sachet", "stick"
	iconEmoji: string;
	category: ProductCategory;

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
	productEmoji: string;        // snapshot
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