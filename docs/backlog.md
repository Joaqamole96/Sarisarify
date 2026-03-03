# SARISARIFY
## Product Backlog
**Version 1.3 | March 2026**

---

## Priority Legend

| Priority | Definition |
|---|---|
| 🔴 Must Have | Core to the value proposition; sprint is not done without it |
| 🟡 Should Have | Important but not blocking the next sprint |
| 🟢 Nice to Have | Enhances experience; deferred if time-constrained |
| ⚪ Deferred | Intentionally out of scope for v1 |

---

## Sprint 0 — Environment & Scaffold ✅ Complete

**Goal:** App installs from URL, opens on Android Chrome, shows a home screen. Firebase connected. No features yet.

> **Implementation notes:** VitePWA dropped in favour of a hand-rolled `static/sw.js` (cache-first, build-hash cache busting, no Workbox). Manifest served from `static/manifest.webmanifest`. Firebase credentials moved to `.env` (VITE_ prefix).

| ID | User Story | Acceptance Criteria | Priority | Status |
|---|---|---|---|---|
| S0-1 | As a developer, I want a SvelteKit + TypeScript project initialised with Tailwind CSS | Project runs locally with no errors; Tailwind styles apply | 🔴 Must Have | ✅ Done |
| S0-2 | As a developer, I want the app configured as a PWA with a web manifest | App can be installed to Android home screen from Chrome; hand-rolled sw.js caches app shell; manifest.webmanifest served from /static | 🔴 Must Have | ✅ Done |
| S0-3 | As a developer, I want a Firebase project connected with Firestore offline persistence enabled | Firestore write succeeds online; queues offline and syncs on reconnect | 🔴 Must Have | ✅ Done |
| S0-4 | As a developer, I want a bottom navigation shell with tab placeholders | App opens with nav tabs visible; no errors in console | 🔴 Must Have | ✅ Done |
| S0-5 | As a developer, I want a service worker caching the app shell | App loads with network disabled after first visit | 🔴 Must Have | ✅ Done |

---

## Sprint 1 — Products ✅ Complete

**Goal:** Operators can manage the product catalogue. Prerequisite for Sales.

> **Implementation notes:** Full product schema in `src/lib/types.ts`. Centralised Firestore layer in `products.svelte.ts`. Emoji icon picker implemented; icon library migration deferred (D-6, now targeted Sprint 3). Firestore security rules deployed. SW cache busting automated. Sprint 2 hotfix added `category` field and `open` pricing mode to `ProductForm`.

| ID | User Story | Acceptance Criteria | Priority | Status |
|---|---|---|---|---|
| P-1 | As an operator, I want to see a list of all products with their name, price, and icon | Products screen shows all items sorted alphabetically; empty state shown when none exist | 🔴 Must Have | ✅ Done |
| P-2 | As an operator, I want to add a new product with a name, price, icon, and category | Form validates name (required) and price (≥0 for non-open products); category required; product appears in list immediately | 🔴 Must Have | ✅ Done |
| P-3 | As an operator, I want to edit an existing product's name, price, icon, or category | Form pre-populates with current values; saving updates the document; list reflects change immediately | 🔴 Must Have | ✅ Done |
| P-4 | As an operator, I want to delete a product I no longer stock | Confirmation prompt shown before deletion; product removed from list; toast notification shown | 🔴 Must Have | ✅ Done |
| P-5 | As an operator, I want to pick an icon from a preset list when adding a product | Icon picker shows common sari-sari categories; selected icon appears on the product card. Emoji rendering on older Android deferred to D-6. | 🟡 Should Have | ✅ Done |
| P-6 | As an operator, I want to bulk-import products from a CSV or XLSX file | File upload accepted; products created from rows; duplicate detection by name | 🟡 Should Have | To Do |
| P-7 | As an operator, I want the unit label field to suggest existing values from the catalogue | Form shows existing unit labels as quick-select chips; new values accepted as free text | 🟡 Should Have | To Do |

---

## Sprint 2 — Sales ✅ Complete

**Goal:** Operators can run a sales session and confirm it as cash, exact, or partial borrow (utang).

> **Implementation notes:** Sales store uses fire-and-forget Firestore writes — cart resets immediately on confirm, write queued offline. Open-priced products (ice) prompt for price at tap time. Confirmation sheet handles change display, optional cash input (blank = exact payment), borrower selection/creation, outstanding balance warning, and optional note. Grid layout with category tab strip replaces flat list. Quick decrement badge on in-cart product cards. Toast notifications on all mutations. Atomic batch write for sale + borrow record when utang > 0. Composite Firestore index required on borrows collection: `(borrowerId, status)`.

| ID | User Story | Acceptance Criteria | Priority | Status |
|---|---|---|---|---|
| SA-1 | As an operator, I want to start a new sales session and see the product catalogue | Sales screen shows all products in a 3-column grid; category tab strip filters by category; empty state shown when no products exist | 🔴 Must Have | ✅ Done |
| SA-2 | As an operator, I want to tap a product to add it to the current sale | Product appears in cart strip with quantity 1; tapping again increments quantity. Open-priced products prompt for price entry. Cart badge shows total quantity. | 🔴 Must Have | ✅ Done |
| SA-3 | As an operator, I want to see the running total of the current sale | Total updates instantly as items are added or removed; reflects per-unit ceiling calculations, deposits, and discounts correctly | 🔴 Must Have | ✅ Done |
| SA-4 | As an operator, I want to confirm a sale with full or partial cash payment | Cash input is optional (blank = exact payment). Change displayed when cash exceeds total. Sale saved to Firestore; session resets immediately. | 🔴 Must Have | ✅ Done |
| SA-5 | As an operator, I want to confirm a sale with a borrow (utang) by selecting the borrower | Borrow amount shown when cash < total; borrower selector required; new borrowers can be created inline; outstanding balance warning shown if applicable; borrow record created atomically with sale | 🔴 Must Have | ✅ Done |
| SA-6 | As an operator, I want to quickly decrement a product already in my cart | Minus badge visible at bottom-left of in-cart product grid cards; tapping removes one unit without entering the cart strip | 🟡 Should Have | ✅ Done |
| SA-7 | As an operator, I want feedback when a sale is confirmed | Toast notification shown immediately after confirmation; message indicates whether utang was recorded | 🟡 Should Have | ✅ Done |

---

## Sprint 3 — Borrows & Sales UX Overhaul

**Goal:** Operators can view, settle, and manage outstanding borrows. The sales confirmation flow is restructured for speed. Products tab gains category management and improved layout.

| ID | User Story | Acceptance Criteria | Priority | Status |
|---|---|---|---|---|
| B-1 | As an operator, I want to see a list of all borrowers with their outstanding balance | Borrows screen shows each borrower with total remaining amount; fully paid borrowers can be hidden | 🔴 Must Have | To Do |
| B-2 | As an operator, I want to see all borrow records for a specific borrower | Tapping a borrower shows a dated list of individual borrow records with original and remaining amounts and status | 🔴 Must Have | To Do |
| B-3 | As an operator, I want to record a payment against a specific borrow record | Payment amount input; partial payment supported; remaining amount decremented; status updated to `partial` or `paid`; payment record created | 🔴 Must Have | To Do |
| B-4 | As an operator, I want a warning when confirming a sale for a borrower with an outstanding balance | Warning shown in confirmation sheet when selected borrower has unpaid or partial records; operator can proceed regardless | 🟡 Should Have | ✅ Done |
| SA-8 | As an operator, I want the sale total and payment input visible on the sales page itself, not in a modal | Total and cash input rendered as part of the sales page; ConfirmSaleSheet replaced with inline confirm panel; borrower selector only appears when borrow > 0 | 🔴 Must Have | To Do |
| SA-9 | As an operator, I want to add or edit a note on a sale after it has been confirmed | Note field on sale detail view in Stats screen; saving updates the Firestore document | 🟡 Should Have | To Do |
| P-8 | As an operator, I want to create, rename, and delete product categories | Category management screen accessible from Products tab; new categories added to `PRODUCT_CATEGORIES` at runtime; deletion blocked if products use that category | 🟡 Should Have | To Do |
| P-9 | As an operator, I want products grouped by category in the Products tab with a side filter | Products tab shows categories as a side rail or sticky section headers; layout optimised for browsing not sales speed | 🟡 Should Have | To Do |
| P-10 | As an operator, I want icon selection grouped by category | Icon picker in ProductForm shows icons relevant to the selected product category; all icons still accessible via an "All" view | 🟢 Nice to Have | To Do |
| D-6* | As an operator, I want product icons from a proper icon library | Emoji picker replaced with Material Symbols or equivalent open icon set; resolves rendering inconsistency on older Android versions | 🔴 Must Have | To Do |
| UX-1 | As an operator, I want the app to be usable on tablets and laptops | Product grid and cart strip use responsive column counts (3 mobile, 4 tablet, 5+ desktop); font sizes and tap targets remain appropriate | 🟡 Should Have | To Do |

---

## Sprint 4 — Statistics

**Goal:** Operators can review revenue and top products across time periods.

| ID | User Story | Acceptance Criteria | Priority | Status |
|---|---|---|---|---|
| ST-1 | As an operator, I want to see total revenue for today, this week, this month, and this year | Each period shows correct revenue; figures update as new sales are confirmed | 🔴 Must Have | To Do |
| ST-2 | As an operator, I want to see the top 5 best-selling products for a selected period | Products ranked by units sold with revenue shown | 🔴 Must Have | To Do |
| ST-3 | As an operator, I want to browse a chronological log of all confirmed sales | Sales log shows each transaction with date, items, total, and payment method | 🟡 Should Have | To Do |
| ST-4 | As an operator, I want to switch between daily, weekly, monthly, and annual views | Period selector updates all stats on screen without page reload | 🔴 Must Have | To Do |

---

## Sprint 5 — Inventory

**Goal:** Operators can track stock levels, see what is running low, and log restocks.

| ID | User Story | Acceptance Criteria | Priority | Status |
|---|---|---|---|---|
| I-1 | As an operator, I want each product to have a current stock quantity | Products screen shows stock count alongside name and price (only for tracked products) | 🔴 Must Have | To Do |
| I-2 | As an operator, I want stock to automatically decrease when a sale is confirmed | Confirming a sale deducts correct quantities from each product atomically; untracked products are skipped | 🔴 Must Have | To Do |
| I-3 | As an operator, I want to log a restock event (received N units of product X) | Stock increases by correct amount; restock recorded with date and quantity | 🔴 Must Have | To Do |
| I-4 | As an operator, I want to see which products are running low | Inventory screen highlights products below their low-stock threshold; untracked products not shown | 🟡 Should Have | To Do |
| I-5 | As an operator, I want to set a low-stock threshold per product | Threshold configurable on product edit screen | 🟡 Should Have | To Do |
| I-6 | As an operator, I want a restock history log per product | Viewing a product shows a dated list of past restock and adjustment events | 🟢 Nice to Have | To Do |
| I-7 | As an operator, I want untracked products excluded from inventory screens | Products with `trackStock=false` do not appear in inventory list, low-stock warnings, or auto-decrement | 🔴 Must Have | To Do |
| I-8 | As an operator, I want to correct stock by setting an exact count | Restock screen allows "set to N" in addition to "add N"; used for drift correction after pack-sold products | 🟡 Should Have | To Do |
| I-9 | As an operator, I want to log a personal-use stock deduction | Subtract N units with reason "personal use"; recorded with date; does not create a sale record | 🟡 Should Have | To Do |

---

## Sprint 6 — Assistant (Phase 1)

**Goal:** The app surfaces rule-based insights from existing sales data to guide restocking and sales decisions.

| ID | User Story | Acceptance Criteria | Priority | Status |
|---|---|---|---|---|
| A-1 | As an operator, I want to see which products are in high, normal, or low sales frequency | Products tagged FREQUENT / NORMAL / SELDOM based on last 100 sales | 🟡 Should Have | To Do |
| A-2 | As an operator, I want the product catalogue sorted by sales frequency during active sales | Frequent products appear first; makes common items fastest to tap | 🟡 Should Have | To Do |
| A-3 | As an operator, I want to see time-of-day sales pattern insights | Assistant screen shows which products sell most in morning, afternoon, evening | 🟡 Should Have | To Do |
| A-4 | As an operator, I want a stock warning insight when a frequently-sold product is running low | Insight card appears: product name, days of stock remaining at current velocity | 🟡 Should Have | To Do |
| A-5 | As an operator, I want a demand forecast for the next day per product | Forecasted quantity shown with confidence level (low/medium/high) | 🟢 Nice to Have | To Do |
| A-6 | As an operator, I want to see suggested related products during an active sale | When one product is in the cart, a suggested area shows products frequently sold alongside it; based on co-purchase history from past sales | 🟢 Nice to Have | To Do |

---

## Deferred Backlog

The following items are intentionally out of scope for v1 and are captured here for future reference.

| ID | User Story | Acceptance Criteria | Priority | Status |
|---|---|---|---|---|
| D-1 | Phase 2 LSTM demand forecasting | Requires 500+ sales; TensorFlow.js deferred until data threshold reached | ⚪ Deferred | Deferred |
| D-2 | Multi-account login with role-based access (owner vs. staff) | Required for multi-operator or Celerio-type deployment | ⚪ Deferred | Deferred |
| D-3 | Receipt printing via Bluetooth thermal printer | PWA Bluetooth API is limited; deferred | ⚪ Deferred | Deferred |
| D-4 | Supplier management and purchase order tracking | Out of scope for sari-sari scale; relevant for Celerio-type project | ⚪ Deferred | Deferred |
| D-5 | iOS / Safari PWA support | Android Chrome is the only required platform for v1 | ⚪ Deferred | Deferred |