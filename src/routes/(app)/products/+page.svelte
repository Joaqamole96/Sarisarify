<script lang="ts">
	import { categories } from '$lib/stores/categories.svelte.ts';
	import { products } from '$lib/stores/products.svelte.ts';
	import { toast } from '$lib/stores/toast.svelte.ts';
	import ProductForm from '$lib/components/ProductForm.svelte';
	import ProductIcon from '$lib/components/ProductIcon.svelte';
	import type { Product, NewProduct } from '$lib/types';

	type SheetMode = 'add' | 'edit' | null;
	let sheetMode    = $state<SheetMode>(null);
	let editTarget   = $state<Product | null>(null);
	let deleteTarget = $state<Product | null>(null);
	let activeCategory = $state<string | 'All'>('All');

	function openAdd() { editTarget = null; sheetMode = 'add'; }
	function openEdit(product: Product) { editTarget = product; sheetMode = 'edit'; }
	function closeSheet() { sheetMode = null; editTarget = null; }

	function handleSave(data: NewProduct) {
		if (sheetMode === 'add') {
			products.add(data);
			toast.show(`${data.name} added`);
		} else if (sheetMode === 'edit' && editTarget) {
			products.update(editTarget.id, data);
			toast.show(`${data.name} updated`);
		}
		closeSheet();
	}

	function confirmDelete() {
		if (!deleteTarget) return;
		const name = deleteTarget.name;
		products.remove(deleteTarget.id);
		deleteTarget = null;
		toast.show(`${name} deleted`, 'info');
	}

	function priceDisplay(p: Product): string {
		if (p.pricingMode === 'open') return 'Open price';
		
		const amount = p.price % 1 === 0 ? `₱${p.price}` : `₱${p.price.toFixed(2)}`;
		
		if (p.pricingMode === 'per_sale') {
			return p.unitLabel ? `${amount}/${p.unitLabel}` : `${amount}/pc`;
		}
		
		if (p.pricingMode === 'per_bundle' && p.bundleQuantity && p.bundlePrice) {
			const bundleAmount = p.bundlePrice % 1 === 0 ? `₱${p.bundlePrice}` : `₱${p.bundlePrice.toFixed(2)}`;
			const unitDisplay = p.unitLabel ? `${amount}/${p.unitLabel}` : `${amount}/pc`;
			return `${unitDisplay} · ${p.bundleQuantity} for ${bundleAmount}`;
		}
		
		// Fallback for per_bundle without bundle fields or other cases
		return p.unitLabel ? `${amount}/${p.unitLabel}` : `${amount}/pc`;
	}

	function badges(p: Product): string[] {
		const b: string[] = [];
		if (p.depositAmount)  b.push(`+₱${p.depositAmount} deposit`);
		if (p.discountAmount) b.push(`-₱${p.discountAmount} disc.`);
		if (!p.trackStock)    b.push('stock untracked');
		// Optionally add bundle badge if it's a bundle product
		if (p.pricingMode === 'per_bundle' && p.bundleQuantity && p.bundlePrice) {
			b.push(`bundle`);
		}
		return b;
	}

	function categoriesWithProducts(): string[] {
		const set = new Set<string>();
		for (const p of products.list) set.add(p.category || 'Uncategorized');
		const known = categories.list.map((c) => c.name);
		for (const k of known) if (products.list.some((p) => p.category === k)) set.add(k);
		return Array.from(set).sort((a, b) => a.localeCompare(b));
	}

	let categoryList = $derived(categoriesWithProducts());
	let visibleProducts = $derived(
		activeCategory === 'All'
			? products.list
			: products.list.filter((p) => (p.category || 'Uncategorized') === activeCategory)
	);

	function groupByCategory(list: Product[]): Array<{ category: string; items: Product[] }> {
		const map = new Map<string, Product[]>();
		for (const p of list) {
			const cat = p.category || 'Uncategorized';
			const arr = map.get(cat);
			if (arr) arr.push(p);
			else map.set(cat, [p]);
		}
		return Array.from(map.entries())
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([category, items]) => ({
				category,
				items: items.sort((a, b) => a.name.localeCompare(b.name))
			}));
	}

	let grouped = $derived(groupByCategory(visibleProducts));
</script>

<div class="mx-auto flex h-full w-full max-w-5xl flex-col">
	<header class="flex items-center justify-between border-b border-gray-100 px-4 py-4">
		<h1 class="text-lg font-bold text-gray-900">Products</h1>
		<div class="flex items-center gap-3">
			<a
				href="/products/categories"
				class="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 active:bg-gray-200"
			>
				Categories
			</a>
			<span class="text-sm text-gray-400">{products.list.length} items</span>
		</div>
	</header>

	<!-- Category filter (browse-optimised) -->
	{#if products.list.length > 0 && categoryList.length > 1}
		<div
			class="flex gap-2 overflow-x-auto border-b border-gray-100 px-4 py-2"
			style="scrollbar-width: none; -ms-overflow-style: none;"
		>
			<button
				onclick={() => activeCategory = 'All'}
				class="flex-shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors
					{activeCategory === 'All'
						? 'bg-green-600 text-white'
						: 'bg-gray-100 text-gray-600 active:bg-gray-200'}"
			>
				All
			</button>
			{#each categoryList as cat}
				<button
					onclick={() => activeCategory = cat}
					class="flex-shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors
						{activeCategory === cat
							? 'bg-green-600 text-white'
							: 'bg-gray-100 text-gray-600 active:bg-gray-200'}"
				>
					{cat}
				</button>
			{/each}
		</div>
	{/if}

	<div class="flex-1 overflow-y-auto">
		{#if products.list.length === 0}
			<div class="flex flex-col items-center justify-center gap-3 px-8 py-24 text-center">
				<span class="text-5xl">📦</span>
				<p class="text-base font-medium text-gray-700">No products yet</p>
				<p class="text-sm text-gray-400">Tap the <strong>+</strong> button below to add your first product.</p>
			</div>
		{:else if visibleProducts.length === 0}
			<div class="flex flex-col items-center justify-center gap-2 px-8 py-16 text-center">
				<p class="text-sm text-gray-400">No products in this category.</p>
			</div>
		{:else}
			<div class="pb-20">
				{#each grouped as section (section.category)}
					<div class="sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-4 py-2 backdrop-blur">
						<p class="text-xs font-semibold uppercase tracking-wide text-gray-500">{section.category}</p>
					</div>
					<ul>
						{#each section.items as product (product.id)}
							<li class="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
								<span class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
									<ProductIcon iconKey={product.iconKey} iconEmoji={product.iconEmoji} class="h-6 w-6 text-gray-900" />
								</span>
								<button class="min-w-0 flex-1 text-left" onclick={() => openEdit(product)}>
									<p class="truncate text-sm font-semibold text-gray-900">{product.name}</p>
									<p class="text-sm font-medium {product.pricingMode === 'open' ? 'text-gray-400 italic' : 'text-green-700'}">
										{priceDisplay(product)}
									</p>
									{#if badges(product).length > 0}
										<p class="mt-0.5 text-xs text-gray-400">{badges(product).join(' · ')}</p>
									{/if}
								</button>
								<button
									onclick={() => deleteTarget = product}
									class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-300 active:text-red-400"
									aria-label="Delete {product.name}"
								>
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
										<path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd"/>
									</svg>
								</button>
							</li>
						{/each}
					</ul>
				{/each}
			</div>
		{/if}
	</div>

	<button
		onclick={openAdd}
		class="absolute bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg text-2xl active:bg-green-700"
		aria-label="Add product"
	>+</button>
</div>

{#if sheetMode}
	<ProductForm
		product={sheetMode === 'edit' ? editTarget ?? undefined : undefined}
		onSave={handleSave}
		onCancel={closeSheet}
	/>
{/if}

{#if deleteTarget}
	<div class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
		<div class="w-full max-w-sm rounded-2xl bg-white p-6">
			<p class="text-base font-semibold text-gray-900">Delete "{deleteTarget.name}"?</p>
			<p class="mt-1 text-sm text-gray-500">This product will be removed from the catalogue. This cannot be undone.</p>
			<div class="mt-5 flex gap-3">
				<button onclick={() => deleteTarget = null} class="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700">Cancel</button>
				<button onclick={confirmDelete} class="flex-1 rounded-xl bg-red-500 py-3 text-sm font-semibold text-white">Delete</button>
			</div>
		</div>
	</div>
{/if}