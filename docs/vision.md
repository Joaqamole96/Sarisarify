---

# Guideline for updating vision.md

Read vision.md and the current sprint-related files in src/. Then update vision.md with the following:
1. Find the sprint list. For each sprint, mark it as one of: [COMPLETED] [IN PROGRESS] [PLANNED].
2. If a sprint's features are partially built, list which sub-features are done and which are not.
3. Do not rewrite goals, principles, or descriptions. Only update sprint statuses.
4. Keep all original wording intact. This is a status update, not a rewrite.

---

# SARISARIFY
## Product Vision Document
**Version 1.2 | March 2026**

---

## 1. Overview

Sarisarify is a Progressive Web App (PWA) designed to digitise the day-to-day operations of a small Filipino sari-sari store. It replaces manual, paper-based tracking with a fast, offline-capable mobile experience that works on any Android device without installation friction.

The app is built primarily for a family of three operators. It is architected from the outset to be general-purpose enough that it could be pitched or adapted for larger retail contexts in the future.

---

## 2. Problem Statement

Small sari-sari stores operate on thin margins and rely heavily on owner memory and handwritten notes to track sales, outstanding credit (utang), and stock levels. This creates several recurring problems:

- Sales are tallied mentally or on paper, making end-of-day reconciliation error-prone.
- Utang is tracked informally, leading to disputes or forgotten balances.
- Stock levels are unknown until shelves are visibly empty, causing missed sales and reactive rather than planned supplier orders.
- There is no historical data to identify which products sell well or when.

Larger neighbouring stores face analogous problems at scale. Without inventory management, delivery staff arrive with insufficient stock, forcing awkward on-the-spot refunds — a problem that a proper inventory system would eliminate upstream.

---

## 3. Vision Statement

> *For small store operators who manage sales, credit, and stock manually — Sarisarify is a mobile-first store management app that brings clarity to daily operations through fast sales logging, utang tracking, inventory awareness, and data-driven insights. Unlike generic POS software, Sarisarify is designed around the specific rhythms and constraints of a sari-sari store: offline-first, single-device, and usable by anyone in the family.*

---

## 4. Target Users

### Primary Users

- Store owner and family operators (3 users, shared device/account)
- Low friction is essential — users are not technical and cannot tolerate complex workflows
- The app must be as fast to use as manual methods, or faster

### Potential Future Users

- Operators of larger retail-wholesale stores (e.g., Celerio-type operations)
- Any small to medium Philippine retail business needing POS + inventory without enterprise overhead

---

## 5. Goals & Success Metrics

| Goal | Success Metric | Priority |
|---|---|---|
| Operators can log a sale in under 10 seconds | Confirmed via usability observation | Must Have |
| Utang balances are always accurate | Zero discrepancies reported after 30 days of use | Must Have |
| App works fully offline in-store | All features functional with mobile data disabled | Must Have |
| Stock levels are visible before they run out | Mother uses inventory screen before supplier orders | Should Have |
| Sales data informs reorder decisions | Insights screen referenced during 1+ grocery run per month | Should Have |
| App installs and opens like a native app | All 3 family members have it on their home screen | Must Have |

---

## 6. Scope

### In Scope (v1)

- **Sales** — session-based sales with tap-to-add product grid, collapsible running cart, and inline total. Supports fixed pricing, per-unit ceiling pricing, and open pricing (operator enters amount at sale time, used for ice bags). Confirmation handles exact payment (default), change display, and partial borrow (utang) with borrower selection. Per-item bottle deposit toggle and per-item discount button. Category filter in vertical left sidebar (single-select).

- **Products** — catalogue management (add, edit, remove). Supports fixed, per-unit, and open pricing modes. Products organised by one of 8 defined categories: Smokes, Snacks, Drinks, Instant Drinks, Alcohol, Food, Toiletries, Load. Optional bottle deposit, optional discount amount, unit labels, and a stock-tracking flag for uncountable products (ice, load). Bulk CSV/XLSX import planned.

- **Borrows** — utang tracking with borrower profiles. Borrowers can be added, renamed, and deleted directly from the Borrows tab. Individual borrow records per sale (not a pooled balance). Partial and full settlement supported, each creating a payment record. Outstanding balance warning during sale confirmation and borrower deletion.

- **Statistics** — daily, weekly, monthly, and annual revenue summaries with top products and a sales log.

- **Inventory** — per-product stock levels, auto-decrement on sale, manual restock logging (add N units or set exact count for drift correction), and personal-use stock adjustment. Products flagged as untracked are excluded entirely.

- **Assistant (Phase 1)** — rule-based insights from sales frequency and time-of-day patterns.

### Out of Scope (v1)

- Multi-user accounts or role-based access
- Supplier management or purchase order workflows
- Receipt printing
- ML/LSTM predictions (Phase 2, deferred until 500+ sales)
- Any Celerio-specific features — a separate project if pursued

---

## 7. Technical Vision

### Stack

- **Framework:** SvelteKit (Svelte 5 with runes)
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Data & Sync:** Firebase Firestore (web SDK with persistent local cache — offline-first)
- **PWA:** Hand-rolled `static/sw.js` (cache-first, build-hash cache busting, no Workbox); manifest served from `/static`

### Key Architectural Principles

- **Offline-first** — all features must function without network access; Firestore handles sync transparently when connectivity returns. High-frequency writes (sale confirmation, product mutations) use fire-and-forget — UI resets immediately, write is queued offline.
- **Single shared Firebase account** — no multi-user auth complexity for v1
- **No native build pipeline** — PWA eliminates Gradle, EAS, and Kotlin version friction entirely
- **Agile delivery** — one working, testable feature per sprint; no scaffolding without running code
- **Centralised data layer** — all Firestore calls go through store modules; no component touches the `db` export directly
- **No loading spinners on CRUD** — Firestore persistent cache resolves reads instantly from disk; toast notifications provide mutation feedback

### Why PWA over Native

The previous iteration of this project was blocked for an extended period by Android build toolchain incompatibilities (Kotlin version mismatches, Compose Compiler conflicts) before any feature shipped. A PWA removes this entire category of risk: there is no native compilation, no EAS build server, and distribution is a URL. The offline and installability requirements are met natively by modern Android Chrome.

---

## 8. Development Approach

Development follows an agile cadence with short sprints. Each sprint delivers a working, testable increment. No sprint is considered complete without a deployable build validated with operators.

- **Sprint 0:** Environment setup, Firebase project, PWA scaffold — success criterion is app installs and opens on Android ✅ [COMPLETED]
- **Sprint 1:** Product catalogue management — success criterion is operators can add, edit, and delete products ✅ [COMPLETED]
- **Sprint 2:** Sales session — success criterion is operators can log a sale and confirm as cash, exact, or borrow ✅ [COMPLETED]
- **Sprint 3:** Borrows management + Sales UX overhaul + Category management ✅ [COMPLETED]
  - **Borrows management:** Borrowers list with outstanding balances, borrower detail with borrow records and status badges, payment recording (partial and full), add/rename/delete borrowers from Borrows tab, outstanding balance warning on deletion ✅
  - **Sales UX overhaul:** Vertical left sidebar category filter (single-select, color-coded), collapsible cart strip with drag handle, collapsible confirm panel (auto-expands on borrow), deposit/discount buttons filled when active, product names 2-line clamped ✅
  - **Category management:** Runtime add/rename/delete categories, auto-assigned category colors (deterministic palette), color swatches in Categories list, colored left-border subheadings in Products and Sales ✅
  - **Bug fixes:** Borrows list not displaying (`$derived` wrapping bug), offline product adding now works (fire-and-forget writes) ✅
- **Sprint 4:** Statistics — revenue summaries and sales log [PLANNED]
- **Sprint 5:** Inventory — stock tracking and restock logging [PLANNED]
- **Sprint 6:** Assistant Phase 1 — rule-based insights [PLANNED]

### Deferred from Sprint 3 to later sprints

The following items from operator feedback are queued for future sprints:

- **Sprint 4:** Tab swipe gestures, dark mode, icon color tinting, phase-out of legacy emoji icons
- **Backlog (post-v1):** Custom product ordering, optional subcategories, custom product images

### Client Feedback Backlog (comments.txt)

The `comments.txt` file serves as the living operator feedback backlog. Items are reviewed at the start of each sprint and folded into the relevant sprint scope or deferred. It is the primary channel for operator-to-developer communication between sessions.

### Agentic Development (from Sprint 3)

Code execution is handled by a local AI agent running offline. The builder role (Claude) produces implementation plans, updated documents, and reviewed code files. The executor role runs code locally, deploys to Firebase Hosting, and validates with operators. The TDD and Backlog are the primary handoff artifacts between builder and executor. Sprint planning and review occur in the shared conversation; code changes are delivered as files.

---

## 9. Constraints & Assumptions

- No WiFi in-store — mobile data only; offline-first is non-negotiable
- Android platform only — iOS support is not required
- Primary device is Android with Chrome — PWA install experience is well-supported
- One active operator at a time — concurrent multi-user editing is not a use case
- Family operators are non-technical — UI must be self-explanatory with no onboarding required
- Some products have floating-point unit prices (e.g. candy at ₱1.25/pc); totals are ceiling-rounded to the nearest peso
- Some products cannot have reliable stock counts (ice bags, mobile load); these are flagged as untracked and excluded from inventory
- Ice bags are sold by peso amount (₱5, ₱10, ₱15, ₱20, ₱30, ₱40 etc.); modelled as open-priced products with price entered at sale time
- Mobile load SKUs are fixed-price products — one product per denomination/promo (e.g. Globe Go59 at ₱59, Smart Giga50 at ₱50)