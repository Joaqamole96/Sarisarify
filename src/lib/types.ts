import type { Timestamp } from 'firebase/firestore';

export type PricingMode = 'fixed' | 'per_unit';

// The canonical shape of a product document in Firestore.
// This is the single source of truth — do not redefine product fields anywhere else.
export interface Product {
	id: string;                  // Firestore document ID — added client-side after read
	name: string;
	price: number;               // unit price in Philippine Peso, always ≥ 0
	                             // for per_unit products (e.g. candy at ₱1.25), this is
	                             // the per-piece price — Sales applies ceil(qty × price)
	pricingMode: PricingMode;    // 'fixed': price × qty; 'per_unit': ceil(price × qty)
	unitLabel?: string;          // display only — "pc", "sachet", "stick"
	iconEmoji: string;

	// Inventory (Sprint 5)
	trackStock: boolean;         // false = excluded from stock tracking and low-stock warnings
	                             // use for uncountable products (ice sacks, load, etc.)
	stock: number;               // current unit count; ignored when trackStock is false

	// Sales behaviour (Sprint 2)
	depositAmount?: number;      // if set, Sales shows a per-item deposit toggle (+₱X)
	discountAmount?: number;     // if set, Sales shows a per-item discount button (-₱X)

	createdAt: Timestamp;        // server timestamp set once on creation, never updated
}

// What the UI submits when creating a new product.
// `id`, `stock`, and `createdAt` are set by the data layer, not the form.
export type NewProduct = Omit<Product, 'id' | 'stock' | 'createdAt'>;