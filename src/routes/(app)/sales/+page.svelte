<script lang="ts">
	import { products } from '$lib/stores/products.svelte.ts';
	import { sales, calcLineTotal } from '$lib/stores/sales.svelte.ts';
	import OpenPriceSheet from '$lib/components/OpenPriceSheet.svelte';
	import ConfirmSaleSheet from '$lib/components/ConfirmSaleSheet.svelte';
	import { PRODUCT_CATEGORIES } from '$lib/types';
	import type { Product, ProductCategory } from '$lib/types';

	let openPriceTarget = $state<Product | null>(null);
	let showConfirm     = $state(false);
	let activeCategory  = $state<ProductCategory | 'All'>('All');

	// Filtered product list — all or by category
	let visibleProducts = $derived(
		activeCategory === 'All'
			? products.list
			: products.list.filter((p) => p.category === activeCategory)
	);

	// Only show category tabs that actually have products
	let populatedCategories = $derived(
		PRODUCT_CATEGORIES.filter((cat) => products.list.some((p) => p.category === cat))
	);

	function handleProductTap(product: Product) {
		if (product.pricingMode === 'open') {
			openPriceTarget = product;
		} else {
			sales.addProduct(product, product.price);
		}
	}

	function handleOpenPriceConfirm(price: number) {
		if (!openPriceTarget) return;
		sales.addProduct(openPriceTarget, price);
		openPriceTarget = null;
	}

	async function handleConfirmSale(params: {
		cashCollected: number;
		borrowerId?: string;
		borrowerName?: string;
		note?: string;
	}) {
		await sales.confirm(params);
		showConfirm = false;
	}

	function cartQty(productId: string): number {
		return sales.cart
			.filter((item) => item.product.id === productId)
			.reduce((sum, item) => sum + item.quantity, 0);
	}

	function priceDisplay(p: Product): string {
		if (p.pricingMode === 'open') return 'Enter price';
		const amount = p.price % 1 === 0 ? `₱${p.price}` : `₱${p.price.toFixed(2)}`;
		if (p.pricingMode === 'per_unit') return `${amount}/${p.unitLabel || 'pc'}`;
		return p.unitLabel ? `${amount} / ${p.unitLabel}` : amount;
	}

	function formatPeso(n: number): string {
		return `₱${n % 1 === 0 ? n : n.toFixed(2)}`;
	}
</script>

<div class="flex h-full flex-col">

	<!-- Header -->
	<header class="flex items-center justify-between border-b border-gray-100 px-4 py-4">
		<h1 class="text-lg font-bold text-gray-900">Sales</h1>
		{#if sales.itemCount > 0}
			<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-semibold text-green-700">
				{sales.itemCount} item{sales.itemCount !== 1 ? 's' : ''}
			</span>
		{/if}
	</header>

	<!-- Cart strip -->
	{#if sales.cart.length > 0}
		<div class="border-b border-gray-100 bg-gray-50 px-4 py-2">
			<div class="flex flex-col gap-1">
				{#each sales.cart as item (item.product.id + '-' + item.unitPrice)}
					<div class="flex items-center justify-between text-sm">
						<div class="flex min-w-0 items-center gap-1.5">
							<span class="text-base">{item.product.iconEmoji}</span>
							<span class="truncate text-gray-700">{item.product.name}</span>
							{#if item.product.pricingMode === 'open'}
								<span class="text-xs text-gray-400">@ {formatPeso(item.unitPrice)}</span>
							{/if}
						</div>
						<div class="flex flex-shrink-0 items-center gap-2 pl-2">
							{#if item.product.depositAmount && item.product.pricingMode !== 'open'}
								<button
									onclick={() => sales.toggleDeposit(item.product.id, item.unitPrice)}
									class="rounded-md px-1.5 py-0.5 text-xs font-medium
										{item.depositApplied ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}"
								>
									+₱{item.product.depositAmount}
								</button>
							{/if}
							{#if item.product.discountAmount && item.product.pricingMode !== 'open'}
								<button
									onclick={() => sales.toggleDiscount(item.product.id, item.unitPrice)}
									class="rounded-md px-1.5 py-0.5 text-xs font-medium
										{item.discountApplied ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'}"
								>
									-₱{item.product.discountAmount}
								</button>
							{/if}
							<button
								onclick={() => sales.removeOne(item.product.id, item.unitPrice)}
								class="flex h-6 w-6 items-center justify-center rounded-full
									bg-gray-200 text-sm font-bold text-gray-600 active:bg-gray-300"
							>−</button>
							<span class="w-4 text-center text-sm font-semibold text-gray-900">
								{item.quantity}
							</span>
							<button
								onclick={() => sales.addProduct(item.product, item.unitPrice)}
								class="flex h-6 w-6 items-center justify-center rounded-full
									bg-gray-200 text-sm font-bold text-gray-600 active:bg-gray-300"
							>+</button>
							<span class="w-14 text-right text-sm font-semibold text-gray-900">
								{formatPeso(calcLineTotal(item))}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Category tab strip — only rendered when there are products with categories -->
	{#if populatedCategories.length > 0}
		<div class="flex gap-2 overflow-x-auto border-b border-gray-100 px-4 py-2
			scrollbar-none" style="scrollbar-width: none; -ms-overflow-style: none;">
			<!-- All tab -->
			<button
				onclick={() => activeCategory = 'All'}
				class="flex-shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors
					{activeCategory === 'All'
						? 'bg-green-600 text-white'
						: 'bg-gray-100 text-gray-600 active:bg-gray-200'}"
			>
				All
			</button>
			{#each populatedCategories as cat}
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

	<!-- Product grid -->
	<div class="flex-1 overflow-y-auto">
		{#if products.list.length === 0}
			<div class="flex flex-col items-center justify-center gap-3 px-8 py-24 text-center">
				<span class="text-5xl">📦</span>
				<p class="text-base font-medium text-gray-700">No products yet</p>
				<p class="text-sm text-gray-400">Add products in the Products tab first.</p>
			</div>
		{:else if visibleProducts.length === 0}
			<div class="flex flex-col items-center justify-center gap-2 px-8 py-16 text-center">
				<p class="text-sm text-gray-400">No products in this category.</p>
			</div>
		{:else}
			<div class="grid grid-cols-3 gap-2 p-3">
				{#each visibleProducts as product (product.id)}
					{@const qty = cartQty(product.id)}
					<button
						onclick={() => handleProductTap(product)}
						class="relative flex flex-col items-center gap-1.5 rounded-2xl
							border-2 bg-white px-2 py-3 text-center active:bg-gray-50 transition-colors
							{qty > 0 ? 'border-green-400 bg-green-50' : 'border-gray-100'}"
					>
						<!-- Quantity badge -->
						{#if qty > 0}
							<span class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center
								rounded-full bg-green-600 text-xs font-bold text-white shadow">
								{qty}
							</span>
						{/if}

						<!-- Icon -->
						<span class="text-3xl leading-none">{product.iconEmoji}</span>

						<!-- Name -->
						<p class="w-full truncate text-xs font-semibold leading-tight text-gray-900">
							{product.name}
						</p>

						<!-- Price -->
						<p class="text-xs font-medium leading-tight
							{product.pricingMode === 'open' ? 'text-gray-400 italic' : 'text-green-700'}">
							{priceDisplay(product)}
						</p>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Confirm bar -->
	{#if sales.cart.length > 0}
		<div class="border-t border-gray-100 bg-white px-4 py-3">
			<button
				onclick={() => showConfirm = true}
				class="flex w-full items-center justify-between rounded-xl bg-green-600
					px-5 py-4 active:bg-green-700"
			>
				<span class="text-sm font-semibold text-white">Confirm Sale</span>
				<span class="text-lg font-bold text-white">{formatPeso(sales.total)}</span>
			</button>
		</div>
	{/if}

</div>

{#if openPriceTarget}
	<OpenPriceSheet
		product={openPriceTarget}
		onConfirm={handleOpenPriceConfirm}
		onCancel={() => openPriceTarget = null}
	/>
{/if}

{#if showConfirm}
	<ConfirmSaleSheet
		total={sales.total}
		onConfirm={handleConfirmSale}
		onCancel={() => showConfirm = false}
	/>
{/if}