---

# Guideline for updating tdd.md

Read all files in the src/ directory. Then update tdd.md with the following:
1. Under each data model, reflect the exact fields currently in the TypeScript types or interfaces. Do not invent fields — only document what exists in the code.
2. For each feature section, mark its status as one of: [PLANNED] [IN PROGRESS] [IMPLEMENTED].
3. If any business logic exists in the code that is not documented in tdd.md, add it under the relevant section.
4. Do not change the structure or formatting of the existing tdd.md. Only update values, statuses, and add missing fields or rules.
5. Do not remove any planned sections — just mark them [PLANNED] if not yet built.

---

# SARISARIFY
## Technical Design Document
**Version 2.0 | March 2026**

> **Purpose:** This document captures business rules, data models, and architectural decisions that are too detailed for the Product Vision and too structural for the Product Backlog. It is the reference for sprint implementation. Update it whenever a schema or rule decision is made during sprint planning.

**Last Updated:** March 2026
**Status:** [IMPLEMENTED] - Core data models and pricing logic implemented

---

## 1. Product Data Model

All product data is stored in a Firestore collection named `products`. The canonical TypeScript interface is in `src/lib/types.ts`. All Firestore reads and writes go through `src/lib/stores/products.svelte.ts` — no component accesses the `db` export directly.

### 1.1 Product Schema

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | Yes | — | Firestore document ID. Added client-side after read. Never stored in the document itself. |
| `name` | `string` | Yes | — | Product display name. Shown on catalogue and sales screens. |
| `price` | `number` | Yes | — | Unit price in Philippine Peso, always ≥ 0. Ignored when `pricingMode` is `'open'`. |
| `pricingMode` | `'per_sale' \| 'per_bundle' \| 'open'` | Yes | `'per_sale'` | `per_sale`: ceil(price × qty). `per_bundle`: bundle pricing with bundleQuantity/bundlePrice. `open`: price entered at sale time. See Section 2. |
| `unitLabel` | `string?` | No | `undefined` | Display-only label shown next to price (e.g. `'pc'`, `'sachet'`). Not used in calculations. Not applicable for open-priced products. |
| `iconKey` | `string?` | No | `undefined` | Preferred icon reference (Sprint 3 D-6). Maps to lucide-svelte icons. |
| `iconEmoji` | `string?` | No | `undefined` | Legacy emoji icon for backwards compatibility. Single emoji character from `src/lib/icons.ts`. |
| `category` | `ProductCategory` | Yes | — | Product category (runtime-managed, not fixed enum). See Section 1.2. |
| `bundleQuantity` | `number?` | No | `undefined` | Number of units in a bundle (e.g., 12 for a dozen). Only for `per_bundle` pricing. |
| `bundlePrice` | `number?` | No | `undefined` | Price for the entire bundle (e.g., 120 for a dozen). Only for `per_bundle` pricing. |
| `trackStock` | `boolean` | Yes | `true` | If false, product is excluded from inventory screens and auto-decrement on sale. Always `false` for open-priced products (locked in ProductForm). |
| `stock` | `number` | Yes | `0` | Current unit count. Ignored when `trackStock` is false. Decremented by confirmed sales (Sprint 5). |
| `depositAmount` | `number?` | No | `undefined` | If set, sales screen shows a per-item deposit toggle (+₱X). Not applicable for open-priced products. |
| `discountAmount` | `number?` | No | `undefined` | If set, sales screen shows a per-item discount button (-₱X). Not applicable for open-priced products. |
| `createdAt` | `Timestamp` | Yes | `serverTimestamp()` | Firestore server timestamp. Set once on creation, never updated. |

### 1.2 Product Categories

The `category` field is required on all products. Categories are runtime-managed via the `categories` store in `src/lib/stores/categories.svelte.ts`. The default categories are seeded from `DEFAULT_CATEGORIES` constant in the categories store.

| Category | Contents |
|---|---|
| Smokes | Cigarettes, tobacco products |
| Snacks | Chips, nuts (Hi-Ho, Dragon Sid), biscuits, similar sachet snacks |
| Drinks | Soft drinks, bottled/sachet water, Zesto juice, ice bags |
| Instant Drinks | Powdered coffee (Kopiko, Nescafe), powdered milk, choco drinks, tea, powdered juice — products sold as sachets mixed with water |
| Alcohol | Beer, spirits, lambanog |
| Food | Canned goods, instant noodles, other ready-to-eat or near-ready items |
| Toiletries | Soap, shampoo, toothpaste, napkins, toilet paper, detergent, fabric conditioner |
| Load | Mobile e-load — Globe and Smart denominations; modelled as separate fixed-price products per promo/denomination (e.g. Globe Go59, Smart Giga50) |

Category management (adding, renaming, deleting categories) is implemented in Sprint 3. Categories are stored in a separate `categories` collection with real-time synchronization. The Load category uses fixed-price products — one Firestore document per denomination/promo. There is no variable-denomination load product type.

---

## 2. Pricing Logic

### 2.1 Per-Sale Pricing (`pricingMode: 'per_sale'`)

Used for the majority of products. The `price` field represents the price per unit. The total is ceiling-rounded to the nearest peso.

```
Line total = Math.ceil(price × quantity)
```

Example: Candy at ₱1.25/pc, quantity 2 → total = ₱3.

### 2.2 Per-Bundle Pricing (`pricingMode: 'per_bundle'`)

Used for products sold in bundles where a bundle has a different price than individual units (e.g., 12 eggs for ₱120 instead of ₱12 each). Requires `bundleQuantity` and `bundlePrice` fields.

```
Line total = (bundles × bundlePrice) + Math.ceil(remainder × unitPrice)
```

Where:
- `bundles = Math.floor(quantity / bundleQuantity)`
- `remainder = quantity % bundleQuantity`

Example — eggs at ₱12/pc, bundle of 12 for ₱120:
- Quantity 12: 1 bundle × ₱120 = ₱120
- Quantity 13: 1 bundle × ₱120 + 1 pc × ₱12 = ₱132

### 2.3 Open Pricing (`pricingMode: 'open'`)

Used for products where the sale amount is not predetermined and is entered by the operator at the time of sale. The canonical use case is ice bags, which are sold by peso amount (e.g. ₱5, ₱15, ₱20, ₱40) rather than by unit count.

- The `price` field is ignored. It is stored as `0` in Firestore.
- `trackStock` is locked to `false` for all open-priced products.
- Deposit and discount toggles are not applicable and are hidden in the sales UI.
- Each tap of an open-priced product on the sales screen opens a price entry prompt (`OpenPriceSheet`).
- Multiple taps of the same open-priced product at different prices create separate cart lines (keyed by `productId + unitPrice`).

```
Line total = unitPrice × quantity
```

No ceiling rounding is applied — open prices are always whole-peso amounts by convention.

### 2.4 Deposit and Discount Adjustments

Deposit and discount are applied after the base line total is calculated. Both are only applicable for `fixed` and `per_unit` products.

- **Deposit:** applied per line (one deposit per transaction, regardless of quantity). Represents a bottle deposit the customer will reclaim.
- **Discount:** applied per unit (`discountAmount × quantity`). Represents an allowed price reduction.
- One discount per line item — discounts cannot stack.

```
Final line total = base_total + (depositAmount if deposit toggled) - (discountAmount × qty if discount applied)
```

---

## 3. Sale Data Model

Confirmed sales are stored in a Firestore collection named `sales`. Sales are written once and never updated (except for the optional `note` field). The sale record is a complete snapshot — it does not reference product documents for display purposes.

### 3.1 SaleLineItem

| Field | Type | Description |
|---|---|---|
| `productId` | `string` | Firestore ID of the product at time of sale. |
| `productName` | `string` | Snapshot of product name. Preserved if product is later renamed or deleted. |
| `productIconKey` | `string?` | Snapshot of preferred icon key at time of sale (preferred over emoji). |
| `productEmoji` | `string?` | Snapshot of legacy icon emoji at time of sale. |
| `pricingMode` | `PricingMode` | Snapshot of pricing mode. Determines how `lineTotal` was calculated. |
| `quantity` | `number` | Units added to this line. |
| `unitPrice` | `number` | For `'open'`: operator-entered price. For `'per_sale'`/`'per_bundle'`: `product.price` at time of sale. |
| `lineTotal` | `number` | Final line total after rounding, deposit, and discount. Stored explicitly for query performance. |
| `depositApplied` | `boolean` | Whether the deposit toggle was active for this line item. |
| `depositAmount` | `number` | Deposit amount per line (0 if no deposit). Stored as snapshot. |
| `discountApplied` | `boolean` | Whether the discount was applied to this line item. |
| `discountAmount` | `number` | Discount per unit (0 if no discount). Stored as snapshot. |

### 3.2 Sale

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Firestore document ID. Added client-side after read. |
| `items` | `SaleLineItem[]` | Array of line items. See Section 3.1. |
| `total` | `number` | Sum of all `lineTotal`s. Stored explicitly for Statistics queries. |
| `cashCollected` | `number` | Amount the customer handed over. May be less than total (borrow), equal (exact), or more (change given). |
| `borrowAmount` | `number` | `total - cashCollected`. 0 for fully paid sales. Stored explicitly for Borrows queries. |
| `borrowerId` | `string?` | Present when `borrowAmount > 0`. References a document in the `borrowers` collection. |
| `borrowerName` | `string?` | Snapshot of borrower name. Present when `borrowAmount > 0`. |
| `note` | `string?` | Optional operator note. May be set at confirmation or edited later from the Stats screen. |
| `createdAt` | `Timestamp` | Firestore server timestamp set at confirmation time. |

---

## 4. Borrow Data Model

Borrows track outstanding credit (utang) with individual customers. The model has three collections: `borrowers` (customer profiles), `borrows` (per-sale borrow records), and `borrowPayments` (per-payment events).

### 4.1 Borrower

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Firestore document ID. |
| `name` | `string` | Borrower display name. Used as the identifier on the Borrows screen. |
| `contact` | `string?` | Optional contact number. Not used in v1 logic; stored for operator reference. |
| `createdAt` | `Timestamp` | Server timestamp set once on creation. |

### 4.2 BorrowRecord

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Firestore document ID. |
| `saleId` | `string` | Reference to the sale document that created this borrow. |
| `borrowerId` | `string` | Reference to the borrower profile. |
| `borrowerName` | `string` | Snapshot of borrower name at time of sale. |
| `originalAmount` | `number` | The borrow amount when first created. Never changes. |
| `remainingAmount` | `number` | Decremented on each payment. Equals `originalAmount` when unpaid. |
| `status` | `'unpaid' \| 'partial' \| 'paid'` | Derived from `remainingAmount` but stored explicitly for query filtering. |
| `note` | `string?` | Optional note. Copied from sale note by default; editable independently. |
| `createdAt` | `Timestamp` | Server timestamp. Matches the sale's `createdAt` (written in same batch). |

A `BorrowRecord` is created atomically with its parent `Sale` in a single Firestore batch write whenever `borrowAmount > 0`. This ensures a sale with a borrow always has a corresponding `BorrowRecord`, and vice versa.

### 4.3 BorrowPayment

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Firestore document ID. |
| `borrowId` | `string` | Reference to the parent `BorrowRecord`. |
| `borrowerId` | `string` | Denormalised for query convenience. |
| `borrowerName` | `string` | Snapshot of borrower name at time of payment. |
| `amount` | `number` | Amount paid in this payment event. |
| `note` | `string?` | Optional operator note for this payment. |
| `createdAt` | `Timestamp` | Server timestamp of the payment. |

Each settlement event creates a new `BorrowPayment` document. The parent `BorrowRecord`'s `remainingAmount` is decremented and `status` is updated atomically in the same write. Payments are always against a specific `BorrowRecord` — there is no pooled balance concept in v1.

---

## 5. Sales Behaviour Rules

### 5.1 Confirmation Flow

The confirmation screen (`ConfirmSaleSheet`) handles all post-cart logic:

- Cash received input is optional. Leaving it blank assumes exact payment (`cashCollected = total`, `borrowAmount = 0`).
- If cash entered exceeds total, a change amount is displayed (`cashEntered - total`). The sale records `cashCollected = total`, not the overpayment.
- If cash entered is less than total, `borrowAmount = total - cashCollected`. The borrower selector becomes required.
- Borrower selector shows existing borrowers (from Firestore) plus an "Add New" option. New borrowers are created in the `borrowers` collection before the sale is confirmed.
- If a selected borrower has existing `unpaid` or `partial` BorrowRecords, a warning is shown. The operator may proceed regardless.
- A note field is available at confirmation. Notes can also be added or edited later from the Statistics screen.

### 5.2 Deposit Toggle

If a product has `depositAmount` set, the cart strip shows a toggle labelled with the deposit amount. Defaults to off. When toggled on, `depositApplied` is set to `true` on the cart line and the deposit is included in `lineTotal`. Not available for open-priced products.

### 5.3 Discount Button

If a product has `discountAmount` set, the cart strip shows a discount button. When applied, `discountApplied` is set to `true` and the discount (per unit) is subtracted from `lineTotal`. One discount per line item — cannot stack. Not available for open-priced products.

---

## 6. Inventory Rules

### 6.1 Stock Tracking Flag

Products with `trackStock = false` are excluded from all inventory screens, low-stock warnings, and auto-decrement on sale confirmation. Their `stock` field exists in the Firestore document but should never be displayed. Open-priced products always have `trackStock = false`.

### 6.2 Restock Modes

- **Add N units:** `stock = stock + N`. Used for standard restocks.
- **Set exact count:** `stock = N`. Used for drift correction after pack-sold products (e.g. candy counted by the piece from a 50-piece pack).

### 6.3 Personal Use Adjustment

Operators may take products for personal use. This deducts stock without creating a sale record. It is recorded with a date and reason of `'personal use'` and appears in the product's adjustment history log (I-6). It does not appear in sales statistics.

---

## 7. Architecture Decisions

### 7.1 Centralised Firestore Data Layer

All Firestore reads and writes are encapsulated in store modules under `src/lib/stores/`. Route components call store functions only — they never import Firestore primitives directly. Collection names are defined once per store module as a const string. TypeScript enforces correct document shapes at compile time.

### 7.2 Fire-and-Forget Writes for Offline-First

The sale confirmation write does not use `await`. The cart is reset immediately before the Firestore call is made. This ensures the UI is never blocked waiting for network acknowledgment. Firestore's `persistentLocalCache` queues the write and syncs transparently when connectivity returns. The operator proceeds to the next customer without delay.

This pattern must be applied to all high-frequency mutation operations (sale confirmation, borrow creation). Low-frequency operations where the operator expects feedback (product add/edit/delete) may continue to use `await`.

### 7.3 No Loading Spinners on CRUD

Firestore's `persistentLocalCache` resolves all reads from local disk instantly. Product list, borrower list, and all other collection reads render immediately without network. The only UI feedback needed for writes is a toast notification (see 7.4). Loading spinners on CRUD operations are an anti-pattern for this architecture.

### 7.4 Toast Notifications

User-facing feedback for all mutations is provided by a lightweight toast system (`src/lib/stores/toast.svelte.ts`). Toasts are fire-and-forget: the store manages auto-dismissal after 2.5 seconds. The `ToastContainer` component is mounted once in the `(app)` layout and rendered above all page content. Toast types: `success` (dark pill with green check), `error` (red), `info` (dark gray).

### 7.5 Service Worker Cache Busting

The service worker cache key is `sarisarify-{BUILD_HASH}` where `BUILD_HASH` is an 8-character hex string injected at build time by the `swCacheBuster` Vite plugin in `vite.config.ts`. On activate, the SW deletes all caches that do not match the current hash.

### 7.6 Firebase Configuration

- **Firestore rules:** `allow read, write: if request.auth != null` — all collections, all paths. No role-based rules in v1.
- **Auth:** Email/password, single shared account. Auth state managed as a singleton in `src/lib/firebase/auth.svelte.ts` via Svelte 5 runes.
- **Composite indexes:** the `hasOutstandingBalance` query in `borrowers.svelte.ts` requires a composite index on `(borrowerId, status)`. Create via the Firestore console link generated on first query execution.

### 7.7 Icon System Migration

The product icon system supports both legacy emoji icons (`iconEmoji`) and modern lucide-svelte icons (`iconKey`). The `iconKey` field is preferred for new products (Sprint 3 D-6), while `iconEmoji` is maintained for backwards compatibility. Icon selection is managed through `src/lib/productIcons.ts` which provides a comprehensive set of lucide-svelte icons organized by category.

### 7.8 Bundle Pricing Implementation

Bundle pricing (`per_bundle` mode) is fully implemented with `bundleQuantity` and `bundlePrice` fields. The pricing calculation automatically applies bundle discounts when quantity reaches the bundle size, with remainder units priced at the regular unit price. This supports common sari-sari store scenarios like "12 eggs for ₱120" instead of ₱12 each.
