<script lang="ts">
	import { products } from '$lib/stores/products.svelte.ts';
	import { sales, calcLineTotal } from '$lib/stores/sales.svelte.ts';
	import { toast } from '$lib/stores/toast.svelte.ts';
	import OpenPriceSheet from '$lib/components/OpenPriceSheet.svelte';
	import ConfirmSalePanel from '$lib/components/ConfirmSalePanel.svelte';
	import ProductIcon from '$lib/components/ProductIcon.svelte';
	import { categories } from '$lib/stores/categories.svelte.ts';
	import type { Product, ProductCategory } from '$lib/types';

	let openPriceTarget = $state<Product | null>(null);
	let selectedCategories = $state<ProductCategory[]>([]);
	let cartExpanded = $state(false);

	let visibleProducts = $derived(
		selectedCategories.length === 0
			? products.list
			: products.list.filter((p) => selectedCategories.includes(p.category))
	);

	function groupByCategory(list: Product[]): Array<{ category: string; items: Product[] }> {
		const by = new Map<string, Product[]>();
		for (const p of list) {
			const cat = p.category || 'Uncategorized';
			const arr = by.get(cat);
			if (arr) arr.push(p);
			else by.set(cat, [p]);
		}

		const order = categories.list.map((c) => c.name);
		const keys = Array.from(by.keys()).sort((a, b) => {
			const ai = order.indexOf(a);
			const bi = order.indexOf(b);
			if (ai === -1 && bi === -1) return a.localeCompare(b);
			if (ai === -1) return 1;
			if (bi === -1) return -1;
			return ai - bi;
		});

		return keys.map((k) => ({
			category: k,
			items: (by.get(k) ?? []).sort((a, b) => a.name.localeCompare(b.name))
		}));
	}

	let groupedVisible = $derived(groupByCategory(visibleProducts));

	// Full Category objects so we can read .color in the sidebar
	let populatedCategories = $derived(
		categories.list.filter((c) => products.list.some((p) => p.category === c.name))
	);

	function categoryColor(name: string): string {
		return categories.list.find((c) => c.name === name)?.color ?? '#9ca3af';
	}

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

	function handleConfirmSale(params: {
		cashCollected: number;
		borrowerId?: string;
		borrowerName?: string;
		note?: string;
	}) {
		const hasBorrow = params.borrowerId !== undefined;
		sales.confirm(params);
		toast.show(hasBorrow ? 'Sale confirmed — utang recorded' : 'Sale confirmed');
	}

	function clearCart() {
		sales.reset();
		cartExpanded = false;
		toast.show('Cart cleared', 'info');
	}

	function cartQty(productId: string): number {
		return sales.cart
			.filter((item) => item.product.id === productId)
			.reduce((sum, item) => sum + item.quantity, 0);
	}

	function cartUnitPrice(productId: string): number {
		return sales.cart.find((item) => item.product.id === productId)?.unitPrice ?? 0;
	}

	function formatPeso(n: number): string {
		return `₱${n % 1 === 0 ? n : n.toFixed(2)}`;
	}

	function priceDisplay(p: Product): string {
		if (p.pricingMode === 'open') return 'Enter price';
		const amount = p.price % 1 === 0 ? `₱${p.price}` : `₱${p.price.toFixed(2)}`;
		if (p.pricingMode === 'per_sale') {
			return p.unitLabel ? `${amount}/${p.unitLabel}` : `${amount}/pc`;
		}
		if (p.pricingMode === 'per_bundle' && p.bundleQuantity && p.bundlePrice) {
			const bundleAmount = p.bundlePrice % 1 === 0 ? `₱${p.bundlePrice}` : `₱${p.bundlePrice.toFixed(2)}`;
			return `${amount}/pc · ${p.bundleQuantity} for ${bundleAmount}`;
		}
		return p.unitLabel ? `${amount}/${p.unitLabel}` : `${amount}/pc`;
	}
</script>

<div class="mx-auto flex h-full w-full max-w-5xl flex-col">

	<!-- Header -->
	<header class="flex items-center justify-between border-b border-emerald-100 bg-emerald-50 px-4 py-4">
		<h1 class="text-lg font-bold text-gray-900">Sales</h1>
		{#if sales.itemCount > 0}
			<div class="flex items-center gap-2">
				<button
					onclick={clearCart}
					class="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 active:bg-gray-100"
				>
					Clear
				</button>
				<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-semibold text-green-700">
					{sales.itemCount} item{sales.itemCount !== 1 ? 's' : ''}
				</span>
			</div>
		{/if}
	</header>

	<!-- Cart strip (collapsible) -->
	{#if sales.cart.length > 0}
		<div class="border-b border-gray-100 bg-gray-50">
			<!-- Toggle bar -->
			<button
				onclick={() => cartExpanded = !cartExpanded}
				class="flex w-full items-center justify-between px-4 py-2"
			>
				<div class="flex items-center gap-2">
					<div class="flex flex-col gap-0.5">
						<span class="block h-0.5 w-5 rounded-full bg-gray-400"></span>
						<span class="block h-0.5 w-5 rounded-full bg-gray-400"></span>
					</div>
					<span class="text-xs font-medium text-gray-500">
						{sales.itemCount} item{sales.itemCount !== 1 ? 's' : ''}
					</span>
				</div>
				<span class="text-sm font-bold text-gray-900">{formatPeso(sales.total)}</span>
			</button>

			{#if cartExpanded}
				<div class="flex flex-col gap-1 px-4 pb-3">
					{#each sales.cart as item (item.product.id + '-' + item.unitPrice)}
						<div class="flex items-center justify-between text-sm">
							<div class="flex min-w-0 items-center gap-1.5">
								<ProductIcon
									iconKey={item.product.iconKey}
									iconEmoji={item.product.iconEmoji}
									class="h-4 w-4 text-gray-900"
								/>
								<span class="truncate text-gray-700">{item.product.name}</span>
								{#if item.product.pricingMode === 'open'}
									<span class="text-xs text-gray-400">@ {formatPeso(item.unitPrice)}</span>
								{/if}
							</div>
							<div class="flex flex-shrink-0 items-center gap-2 pl-2">
								{#if item.product.depositAmount && item.product.pricingMode !== 'open'}
									<button
										onclick={() => sales.toggleDeposit(item.product.id, item.unitPrice)}
										class="rounded-lg px-2 py-1 text-xs font-semibold transition-colors
											{item.depositApplied
												? 'bg-blue-500 text-white'
												: 'bg-blue-100 text-blue-600'}"
									>
										+₱{item.product.depositAmount}
									</button>
								{/if}
								{#if item.product.discountAmount && item.product.pricingMode !== 'open'}
									<button
										onclick={() => sales.toggleDiscount(item.product.id, item.unitPrice)}
										class="rounded-lg px-2 py-1 text-xs font-semibold transition-colors
											{item.discountApplied
												? 'bg-orange-500 text-white'
												: 'bg-orange-100 text-orange-600'}"
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
			{/if}
		</div>
	{/if}

	<!-- Main: left sidebar + product grid -->
	<div class="flex flex-1 overflow-hidden">

		<!-- Category sidebar -->
		{#if populatedCategories.length > 0}
			<div
				class="flex flex-col gap-1 overflow-y-auto border-r border-gray-100 bg-white py-2"
				style="width: 72px; scrollbar-width: none; -ms-overflow-style: none;"
			>
				<button
					onclick={() => selectedCategories = []}
					class="mx-1 rounded-xl px-1 py-2 text-center text-xs font-bold transition-colors
						{selectedCategories.length === 0
							? 'bg-gray-800 text-white'
							: 'text-gray-400 active:bg-gray-100'}"
				>
					All
				</button>
				{#each populatedCategories as c}
					<button
						onclick={() => {
							selectedCategories = selectedCategories.includes(c.name) ? [] : [c.name];
						}}
						class="mx-1 rounded-xl px-1 py-2 text-center text-xs font-bold transition-colors
							{selectedCategories.includes(c.name) ? 'text-white' : 'active:bg-gray-100'}"
						style={selectedCategories.includes(c.name)
							? `background-color: ${c.color}`
							: `color: ${c.color}`}
					>
						<span class="line-clamp-2 leading-tight">{c.name}</span>
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
				<div class="pb-2">
					{#each groupedVisible as section (section.category)}
						<div
							class="sticky top-0 z-10 border-b border-gray-100 bg-white/95 py-2 pl-3 pr-4 backdrop-blur"
							style="border-left: 4px solid {categoryColor(section.category)}"
						>
							<p class="text-sm font-bold text-gray-800">{section.category}</p>
						</div>
						<div class="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
							{#each section.items as product (product.id)}
								{@const qty = cartQty(product.id)}
								<div class="relative">
									<button
										onclick={() => handleProductTap(product)}
										class="flex w-full flex-col items-center gap-1.5 rounded-2xl border-2
											bg-white px-2 py-3 text-center transition-colors active:bg-gray-50
											{qty > 0 ? 'border-green-400 bg-green-50' : 'border-gray-100'}"
									>
										{#if qty > 0}
											<span class="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center
												justify-center rounded-full bg-green-600 text-xs font-bold text-white shadow">
												{qty}
											</span>
										{/if}
										<span class="flex items-center justify-center">
											<ProductIcon
												iconKey={product.iconKey}
												iconEmoji={product.iconEmoji}
												class="h-8 w-8 text-gray-900"
											/>
										</span>
										<p class="w-full line-clamp-2 text-[11px] font-semibold leading-tight text-gray-900">
											{product.name}
										</p>
										<p class="text-xs font-medium leading-tight
											{product.pricingMode === 'open' ? 'text-gray-400 italic' : 'text-green-700'}">
											{priceDisplay(product)}
										</p>
									</button>

									{#if qty > 0 && product.pricingMode !== 'open'}
										<button
											onclick={(e) => {
												e.stopPropagation();
												sales.removeOne(product.id, cartUnitPrice(product.id));
											}}
											class="absolute right-0 top-0 flex h-full w-6 items-center justify-center
												rounded-r-2xl bg-gray-400 text-white active:bg-gray-600"
											aria-label="Remove one {product.name}"
										>−</button>
									{/if}
								</div>
							{/each}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Confirm bar -->
	{#if sales.cart.length > 0}
		<ConfirmSalePanel total={sales.total} onConfirm={handleConfirmSale} />
	{/if}

</div>

{#if openPriceTarget}
	<OpenPriceSheet
		product={openPriceTarget}
		onConfirm={handleOpenPriceConfirm}
		onCancel={() => openPriceTarget = null}
	/>
{/if}