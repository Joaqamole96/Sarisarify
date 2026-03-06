<script lang="ts">
	import { products } from '$lib/stores/products.svelte.ts';
	import { toast } from '$lib/stores/toast.svelte.ts';

	// Tracked products only, sorted by name (already ordered by store)
	let tracked = $derived(products.list.filter((p) => p.trackStock));

	// ── Restock sheet ────────────────────────────────────────────────────────
	let restockTarget = $state<typeof products.list[0] | null>(null);
	let restockMode   = $state<'add' | 'set'>('add');
	let restockAmount = $state('');

	function openRestock(p: typeof products.list[0]) {
		restockTarget = p;
		restockMode   = 'add';
		restockAmount = '';
	}

	function closeRestock() {
		restockTarget = null;
		restockAmount = '';
	}

	function confirmRestock() {
		if (!restockTarget) return;
		const n = parseInt(restockAmount, 10);
		if (!n || n <= 0) return;
		products.restock(restockTarget, restockMode, n);
		toast.show(
			restockMode === 'add'
				? `+${n} added to ${restockTarget.name}`
				: `${restockTarget.name} set to ${n}`
		);
		closeRestock();
	}

	// ── Personal use sheet ───────────────────────────────────────────────────
	let personalTarget = $state<typeof products.list[0] | null>(null);
	let personalAmount = $state('');

	function openPersonalUse(p: typeof products.list[0]) {
		personalTarget = p;
		personalAmount = '';
	}

	function closePersonalUse() {
		personalTarget = null;
		personalAmount = '';
	}

	function confirmPersonalUse() {
		if (!personalTarget) return;
		const n = parseInt(personalAmount, 10);
		if (!n || n <= 0) return;
		products.personalUse(personalTarget, n);
		toast.show(`-${n} personal use from ${personalTarget.name}`);
		closePersonalUse();
	}

	function stockColor(stock: number): string {
		if (stock === 0) return 'text-red-600';
		if (stock <= 5)  return 'text-amber-600';
		return 'text-gray-900';
	}
</script>

<div class="mx-auto flex h-full w-full max-w-5xl flex-col">
	<header class="border-b border-gray-100 px-4 py-4">
		<h1 class="text-lg font-bold text-gray-900">Inventory</h1>
		<p class="text-xs text-gray-400">{tracked.length} tracked product{tracked.length !== 1 ? 's' : ''}</p>
	</header>

	<div class="flex-1 overflow-y-auto">
		{#if tracked.length === 0}
			<div class="flex flex-col items-center justify-center gap-3 px-8 py-24 text-center">
				<p class="text-base font-medium text-gray-700">No tracked products</p>
				<p class="text-sm text-gray-400">Enable stock tracking on a product to see it here.</p>
			</div>
		{:else}
			<ul>
				{#each tracked as product (product.id)}
					<li class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-semibold text-gray-900">{product.name}</p>
							<p class="text-xs text-gray-400">{product.category}</p>
						</div>
						<span class="w-10 text-right text-lg font-bold {stockColor(product.stock)}">
							{product.stock}
						</span>
						<div class="flex gap-2">
							<button
								onclick={() => openPersonalUse(product)}
								class="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 active:bg-gray-200"
							>
								Use
							</button>
							<button
								onclick={() => openRestock(product)}
								class="rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white active:bg-green-700"
							>
								Restock
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<!-- ── Restock modal ──────────────────────────────────────────────────────── -->
{#if restockTarget}
	<div
		class="fixed inset-0 z-50 flex items-end bg-black/40"
		role="dialog"
		aria-modal="true"
	>
		<div class="w-full rounded-t-3xl bg-white px-5 pb-10 pt-5">
			<p class="mb-1 text-base font-bold text-gray-900">Restock · {restockTarget.name}</p>
			<p class="mb-4 text-sm text-gray-400">Current stock: {restockTarget.stock}</p>

			<!-- Mode toggle -->
			<div class="mb-4 flex gap-2">
				<button
					onclick={() => (restockMode = 'add')}
					class="flex-1 rounded-xl py-2 text-sm font-semibold
						{restockMode === 'add' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}"
				>
					Add units
				</button>
				<button
					onclick={() => (restockMode = 'set')}
					class="flex-1 rounded-xl py-2 text-sm font-semibold
						{restockMode === 'set' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}"
				>
					Set exact
				</button>
			</div>

			<input
				type="number"
				inputmode="numeric"
				min="1"
				placeholder={restockMode === 'add' ? 'Units to add' : 'New stock count'}
				bind:value={restockAmount}
				class="mb-4 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm
					text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
			/>

			<button
				onclick={confirmRestock}
				disabled={!restockAmount || parseInt(restockAmount) <= 0}
				class="mb-3 w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white
					active:bg-green-700 disabled:opacity-40"
			>
				{restockMode === 'add' ? `Add ${restockAmount || '…'} units` : `Set to ${restockAmount || '…'}`}
			</button>
			<button
				onclick={closeRestock}
				class="w-full rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-700 active:bg-gray-200"
			>
				Cancel
			</button>
		</div>
	</div>
{/if}

<!-- ── Personal use modal ─────────────────────────────────────────────────── -->
{#if personalTarget}
	<div
		class="fixed inset-0 z-50 flex items-end bg-black/40"
		role="dialog"
		aria-modal="true"
	>
		<div class="w-full rounded-t-3xl bg-white px-5 pb-10 pt-5">
			<p class="mb-1 text-base font-bold text-gray-900">Personal Use · {personalTarget.name}</p>
			<p class="mb-4 text-sm text-gray-400">Current stock: {personalTarget.stock}</p>

			<input
				type="number"
				inputmode="numeric"
				min="1"
				placeholder="Units used"
				bind:value={personalAmount}
				class="mb-4 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm
					text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
			/>

			<button
				onclick={confirmPersonalUse}
				disabled={!personalAmount || parseInt(personalAmount) <= 0}
				class="mb-3 w-full rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white
					active:bg-amber-700 disabled:opacity-40"
			>
				Deduct {personalAmount || '…'} units
			</button>
			<button
				onclick={closePersonalUse}
				class="w-full rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-700 active:bg-gray-200"
			>
				Cancel
			</button>
		</div>
	</div>
{/if}