import { create } from 'zustand';
import type { ActiveSaleItem, PaymentMethod, ProductWithTier } from '@/types';
import * as saleRepository from '@/repositories/saleRepository';

interface SaleStore {
  items: ActiveSaleItem[];

  // Derived
  total: number;
  borrowedTotal: number;

  // Actions
  addItem: (product: ProductWithTier) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  toggleBorrowed: (productId: string) => void;
  clearSale: () => void;
  confirmSale: (method: PaymentMethod, borrowerName?: string) => Promise<void>;
}

function computeTotals(items: ActiveSaleItem[]) {
  const total = items.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0
  );
  const borrowedTotal = items
    .filter((i) => i.isBorrowed)
    .reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  return { total, borrowedTotal };
}

export const useSaleStore = create<SaleStore>((set, get) => ({
  items: [],
  total: 0,
  borrowedTotal: 0,

  addItem: (product) => {
    const items = get().items;
    const existing = items.find((i) => i.product.id === product.id);

    const updated = existing
      ? items.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      : [...items, { product, quantity: 1, isBorrowed: false }];

    set({ items: updated, ...computeTotals(updated) });
  },

  removeItem: (productId) => {
    const updated = get().items.filter((i) => i.product.id !== productId);
    set({ items: updated, ...computeTotals(updated) });
  },

  setQuantity: (productId, quantity) => {
    if (quantity < 1) {
      get().removeItem(productId);
      return;
    }
    const updated = get().items.map((i) =>
      i.product.id === productId ? { ...i, quantity } : i
    );
    set({ items: updated, ...computeTotals(updated) });
  },

  toggleBorrowed: (productId) => {
    const updated = get().items.map((i) =>
      i.product.id === productId ? { ...i, isBorrowed: !i.isBorrowed } : i
    );
    set({ items: updated, ...computeTotals(updated) });
  },

  clearSale: () => set({ items: [], total: 0, borrowedTotal: 0 }),

  confirmSale: async (method, borrowerName) => {
    const { items } = get();
    if (items.length === 0) throw new Error('Cannot confirm an empty sale');

    await saleRepository.confirmSale({
      items,
      paymentMethod: method,
      borrowerName,
    });

    set({ items: [], total: 0, borrowedTotal: 0 });
  },
}));
