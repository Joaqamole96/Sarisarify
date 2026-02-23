import { create } from 'zustand';
import type {
  ProductWithTier,
  BorrowWithDetails,
  Borrower,
  StatsSummary,
  StatsPeriod,
  SaleWithItems,
  Insight,
  ForecastItem,
  MLPhase,
  CreateProductPayload,
  UpdateProductPayload,
} from '@/types';
import * as productRepository from '@/repositories/productRepository';
import * as borrowRepository from '@/repositories/borrowRepository';
import * as statisticsRepository from '@/repositories/statisticsRepository';
import * as saleRepository from '@/repositories/saleRepository';

// ─────────────────────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────────────────────

interface ProductStore {
  products: ProductWithTier[];
  isLoading: boolean;
  loadProducts: () => Promise<void>;
  addProduct: (payload: CreateProductPayload) => Promise<void>;
  updateProduct: (id: string, payload: UpdateProductPayload) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
}

export const useProductStore = create<ProductStore>((set) => ({
  products: [],
  isLoading: false,

  loadProducts: async () => {
    set({ isLoading: true });
    const products = await productRepository.getAllProducts();
    set({ products, isLoading: false });
  },

  addProduct: async (payload) => {
    await productRepository.createProduct(payload);
    const products = await productRepository.getAllProducts();
    set({ products });
  },

  updateProduct: async (id, payload) => {
    await productRepository.updateProduct(id, payload);
    const products = await productRepository.getAllProducts();
    set({ products });
  },

  removeProduct: async (id) => {
    await productRepository.deleteProduct(id);
    const products = await productRepository.getAllProducts();
    set({ products });
  },
}));

// ─────────────────────────────────────────────────────────────
// Borrows
// ─────────────────────────────────────────────────────────────

interface BorrowStore {
  borrowers: Borrower[];
  borrows: BorrowWithDetails[];
  isLoading: boolean;
  loadBorrowers: () => Promise<void>;
  loadBorrowsForBorrower: (borrowerId: string) => Promise<void>;
  recordPayment: (borrowId: string, amount: number) => Promise<void>;
}

export const useBorrowStore = create<BorrowStore>((set) => ({
  borrowers: [],
  borrows: [],
  isLoading: false,

  loadBorrowers: async () => {
    set({ isLoading: true });
    const borrowers = await borrowRepository.getAllBorrowers();
    set({ borrowers, isLoading: false });
  },

  loadBorrowsForBorrower: async (borrowerId) => {
    set({ isLoading: true });
    const borrows = await borrowRepository.getActiveBorrowsForBorrower(borrowerId);
    set({ borrows, isLoading: false });
  },

  recordPayment: async (borrowId, amount) => {
    await borrowRepository.recordPayment(borrowId, amount);
    const updated = await borrowRepository.getBorrowById(borrowId);
    if (!updated) return;
    set((state) => ({
      borrows: state.borrows.map((b) => (b.id === borrowId ? updated : b)),
    }));
  },
}));

// ─────────────────────────────────────────────────────────────
// Statistics
// ─────────────────────────────────────────────────────────────

interface StatisticsStore {
  summary: StatsSummary | null;
  log: SaleWithItems[];
  logPage: number;
  isLoading: boolean;
  loadSummary: (period: StatsPeriod) => Promise<void>;
  loadLog: (page?: number) => Promise<void>;
}

export const useStatisticsStore = create<StatisticsStore>((set, get) => ({
  summary: null,
  log: [],
  logPage: 0,
  isLoading: false,

  loadSummary: async (period) => {
    set({ isLoading: true });
    const summary = await statisticsRepository.getSummary(period);
    set({ summary, isLoading: false });
  },

  loadLog: async (page = 0) => {
    set({ isLoading: true });
    const entries = await saleRepository.getSalesLog(page);
    set((state) => ({
      log: page === 0 ? entries : [...state.log, ...entries],
      logPage: page,
      isLoading: false,
    }));
  },
}));

// ─────────────────────────────────────────────────────────────
// Assistant
// ─────────────────────────────────────────────────────────────

interface AssistantStore {
  insights: Insight[];
  forecast: ForecastItem[];
  phase: MLPhase;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export const useAssistantStore = create<AssistantStore>((set) => ({
  insights: [],
  forecast: [],
  phase: 'rule',
  isLoading: false,

  refresh: async () => {
    set({ isLoading: true });
    const { runAssistant } = await import('@/ml/phaseController');
    const result = await runAssistant();
    set({
      insights: result.insights,
      forecast: result.forecast,
      phase: result.phase,
      isLoading: false,
    });
  },
}));