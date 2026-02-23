// ─────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────

export type PaymentMethod = 'CASH' | 'BORROW' | 'PARTIAL';

export type BorrowStatus = 'ACTIVE' | 'RESOLVED';

export type FrequencyTier = 'FREQUENT' | 'NORMAL' | 'SELDOM';

export type MLPhase = 'rule' | 'lstm';

// ─────────────────────────────────────────────────────────────
// Database Entities (mirror SQLite schema 1:1)
// ─────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  price: number;
  iconId: string;
  createdAt: number;
  updatedAt: number;
}

export interface Sale {
  id: string;
  paymentMethod: PaymentMethod;
  confirmedAt: number;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  priceAtSale: number;
  isBorrowed: boolean;
}

export interface Borrower {
  id: string;
  name: string;
  createdAt: number;
}

export interface Borrow {
  id: string;
  borrowerId: string;
  saleId: string;
  totalAmount: number;
  outstandingBalance: number;
  status: BorrowStatus;
  createdAt: number;
  updatedAt: number;
}

export interface BorrowPayment {
  id: string;
  borrowId: string;
  amount: number;
  paidAt: number;
}

// ─────────────────────────────────────────────────────────────
// Derived / Enriched Types (used in UI and stores)
// ─────────────────────────────────────────────────────────────

export interface ProductWithTier extends Product {
  frequencyTier: FrequencyTier;
}

/** A line item inside an active (unconfirmed) Sale session. */
export interface ActiveSaleItem {
  product: ProductWithTier;
  quantity: number;
  isBorrowed: boolean;
}

/** A confirmed Sale with its line items joined. */
export interface SaleWithItems extends Sale {
  items: (SaleItem & { product: Product })[];
  total: number;
}

/** A Borrow with its parent Sale, borrower, and payment history joined. */
export interface BorrowWithDetails extends Borrow {
  borrower: Borrower;
  sale: SaleWithItems;
  payments: BorrowPayment[];
}

// ─────────────────────────────────────────────────────────────
// Statistics
// ─────────────────────────────────────────────────────────────

export type StatsPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export interface StatsSummary {
  period: StatsPeriod;
  /** Start of the completed period (Unix timestamp) */
  from: number;
  /** End of the completed period (Unix timestamp) */
  to: number;
  totalRevenue: number;
  transactionCount: number;
  topProducts: { product: Product; totalSold: number; revenue: number }[];
}

// ─────────────────────────────────────────────────────────────
// ML / Assistant
// ─────────────────────────────────────────────────────────────

export interface Insight {
  id: string;
  message: string;
  /** ISO date string of when the insight was generated */
  generatedAt: string;
}

export interface ForecastItem {
  product: Product;
  /** Predicted number of Sale appearances in the next day */
  predictedDemand: number;
  confidence: 'low' | 'medium' | 'high';
}

// ─────────────────────────────────────────────────────────────
// Repository Payloads
// ─────────────────────────────────────────────────────────────

export interface ConfirmSalePayload {
  items: ActiveSaleItem[];
  paymentMethod: PaymentMethod;
  /** Required when paymentMethod is BORROW or PARTIAL */
  borrowerName?: string;
}

export interface CreateProductPayload {
  name: string;
  price: number;
  iconId: string;
}

export interface UpdateProductPayload {
  name?: string;
  price?: number;
  iconId?: string;
}
