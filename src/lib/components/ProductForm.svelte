<script lang="ts">
	import ProductIcon from '$lib/components/ProductIcon.svelte';
	import { PRODUCT_ICON_OPTIONS, iconKeysForCategory, type ProductIconKey } from '$lib/productIcons';
	import { categories } from '$lib/stores/categories.svelte.ts';
	import type { Product, NewProduct, PricingMode, ProductCategory } from '$lib/types';

	interface Props {
		product?: Product;
		onSave: (data: NewProduct) => Promise<void>;
		onCancel: () => void;
	}

	let { product, onSave, onCancel }: Props = $props();

	let name           = $state('');
	let price          = $state<string | number>('');
	let pricingMode    = $state<PricingMode>('per_sale');
	let unitLabel      = $state('');
	let iconKey        = $state<ProductIconKey>('package');
	let iconEmoji      = $state('');
	let category       = $state<ProductCategory>('');
	type IconView = 'suggested' | 'all';
	let iconView = $state<IconView>('suggested');
	let trackStock     = $state(true);
	let depositAmount  = $state<string | number>('');
	let discountAmount = $state<string | number>('');
	let bundleQuantity = $state<string | number>('');
	let bundlePrice    = $state<string | number>('');

	// Initialize local form state once from the incoming product (if any).
	// This avoids Svelte 5 "state referenced locally" warnings while preserving the
	// expected "edit form is prefilled once" behaviour.
	let initialized = $state(false);
	$effect(() => {
		if (initialized) return;
		if (product) {
			name = product.name ?? '';
			price = product.price ?? '';
			pricingMode = product.pricingMode ?? 'per_sale';
			unitLabel = product.unitLabel ?? '';
			iconKey = (product.iconKey as ProductIconKey) ?? 'package';
			iconEmoji = product.iconEmoji ?? '';
			category = product.category ?? '';
			trackStock = product.trackStock ?? true;
			depositAmount = product.depositAmount ?? '';
			discountAmount = product.discountAmount ?? '';
			bundleQuantity = product.bundleQuantity ?? '';
			bundlePrice = product.bundlePrice ?? '';
		}
		initialized = true;
	});

	// If creating a new product, default the category to the first available category.
	$effect(() => {
		if (product) return;
		if (category) return;
		if (categories.list.length > 0) category = categories.list[0].name;
	});

	let saving = $state(false);
	let errors = $state<Record<string, string>>({});

	// When pricing mode is set to open, price is irrelevant and trackStock must be false
	$effect(() => {
		if (pricingMode === 'open') {
			trackStock = false;
		}
	});

	function validate(): boolean {
		errors = {};
		if (!name.trim()) errors.name = 'Name is required.';
		
		if (pricingMode === 'per_sale' || pricingMode === 'per_bundle') {
			if (price === '' || Number(price) < 0)
				errors.price = 'Price must be 0 or more.';
		}
		
		if (pricingMode === 'per_bundle') {
			if (bundleQuantity === '' || Number(bundleQuantity) < 1)
				errors.bundleQuantity = 'Bundle quantity must be at least 1.';
			if (bundlePrice === '' || Number(bundlePrice) < 0)
				errors.bundlePrice = 'Bundle price must be 0 or more.';
			if (bundlePrice !== '' && price !== '' && Number(bundlePrice) <= Number(price)) {
				errors.bundlePrice = 'Bundle price should be greater than unit price for bulk discount.';
			}
		}
		
		if (depositAmount !== '' && Number(depositAmount) < 0)
			errors.depositAmount = 'Deposit must be 0 or more.';
		if (discountAmount !== '' && Number(discountAmount) < 0)
			errors.discountAmount = 'Discount must be 0 or more.';
		return Object.keys(errors).length === 0;
	}

	async function handleSave() {
		if (!validate()) return;
		saving = true;
		try {
			const data: NewProduct = {
				name:        name.trim(),
				price:       pricingMode === 'open' ? 0 : Number(price),
				pricingMode,
				iconKey,
				...(iconEmoji.trim() && { iconEmoji: iconEmoji.trim() }),
				category,
				trackStock:  pricingMode === 'open' ? false : trackStock,
				...(unitLabel.trim()       && { unitLabel:      unitLabel.trim() }),
				...(depositAmount  !== ''  && pricingMode !== 'open' && { depositAmount:  Number(depositAmount) }),
				...(discountAmount !== ''  && pricingMode !== 'open' && { discountAmount: Number(discountAmount) }),
				...(pricingMode === 'per_bundle' && bundleQuantity !== '' && { bundleQuantity: Number(bundleQuantity) }),
				...(pricingMode === 'per_bundle' && bundlePrice !== '' && { bundlePrice: Number(bundlePrice) }),
			};
			await onSave(data);
		} finally {
			saving = false;
		}
	}

	let isEditing = $derived(!!product);

	let suggestedKeys = $derived(iconKeysForCategory(category));
	let suggestedOptions = $derived(
		PRODUCT_ICON_OPTIONS.filter((o) => suggestedKeys.includes(o.key))
	);
</script>

<!-- Backdrop -->
<button
	class="fixed inset-0 z-40 bg-black/40"
	onclick={onCancel}
	aria-label="Close"
></button>

<!-- Sheet -->
<div class="fixed bottom-0 left-0 right-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl bg-white">

	<!-- Handle + header -->
	<div class="flex flex-col items-center px-4 pt-3 pb-2">
		<div class="mb-3 h-1 w-10 rounded-full bg-gray-200"></div>
		<div class="flex w-full items-center justify-between">
			<button onclick={onCancel} class="text-sm text-gray-500">Cancel</button>
			<h2 class="text-base font-semibold">{isEditing ? 'Edit Product' : 'New Product'}</h2>
			<button
				onclick={handleSave}
				disabled={saving}
				class="text-sm font-semibold text-green-600 disabled:opacity-40"
			>
				{saving ? 'Saving…' : 'Save'}
			</button>
		</div>
	</div>

	<div class="overflow-y-auto px-4 pb-8 pt-2 flex flex-col gap-5">

		<!-- Icon picker -->
		<div>
			<p class="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Icon</p>
			<div class="mb-2 flex rounded-xl overflow-hidden border border-gray-200">
				<button
					onclick={() => iconView = 'suggested'}
					class="flex-1 py-2.5 text-sm font-medium transition
						{iconView === 'suggested' ? 'bg-green-600 text-white' : 'bg-white text-gray-600'}"
				>
					Suggested
				</button>
				<button
					onclick={() => iconView = 'all'}
					class="flex-1 py-2.5 text-sm font-medium transition
						{iconView === 'all' ? 'bg-green-600 text-white' : 'bg-white text-gray-600'}"
				>
					All
				</button>
			</div>

			{#if iconView === 'suggested'}
				<div class="flex flex-wrap gap-2">
					{#each suggestedOptions as opt (opt.key)}
						<button
							onclick={() => iconKey = opt.key}
							class="flex h-10 w-10 items-center justify-center rounded-xl transition
								{iconKey === opt.key ? 'bg-green-100 ring-2 ring-green-500' : 'bg-gray-100'}"
							aria-label={opt.label}
							title={opt.label}
						>
							<ProductIcon iconKey={opt.key} class="h-5 w-5 text-gray-800" />
						</button>
					{/each}
				</div>
				<p class="mt-2 text-xs text-gray-400">
					Suggested icons are based on the selected category.
				</p>
			{:else}
				<div class="flex flex-wrap gap-2">
					{#each PRODUCT_ICON_OPTIONS as opt (opt.key)}
						<button
							onclick={() => iconKey = opt.key}
							class="flex h-10 w-10 items-center justify-center rounded-xl transition
								{iconKey === opt.key ? 'bg-green-100 ring-2 ring-green-500' : 'bg-gray-100'}"
							aria-label={opt.label}
							title={opt.label}
						>
							<ProductIcon iconKey={opt.key} class="h-5 w-5 text-gray-800" />
						</button>
					{/each}
				</div>
			{/if}
			<p class="mt-2 text-xs text-gray-400">
				Legacy emoji (optional):
			</p>
			<input
				type="text"
				bind:value={iconEmoji}
				placeholder="Leave blank to use icons"
				class="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm
					text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
			/>
		</div>

		<!-- Name -->
		<div>
			<label for="product-name" class="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
				Product name
			</label>
			<input
				id="product-name"
				type="text"
				bind:value={name}
				placeholder="e.g. Piattos, Marlboro Red"
				class="w-full rounded-xl border px-4 py-3 text-base outline-none
					{errors.name ? 'border-red-400' : 'border-gray-200 focus:border-green-500'}"
			/>
			{#if errors.name}<p class="mt-1 text-xs text-red-500">{errors.name}</p>{/if}
		</div>

		<!-- Category -->
		<div>
			<p class="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</p>
			<div class="flex flex-wrap gap-2">
				{#each categories.list as c (c.id)}
					{@const cat = c.name}
					<button
						onclick={() => category = cat}
						class="rounded-full border px-3 py-1.5 text-sm font-medium transition
							{category === cat
								? 'border-green-500 bg-green-50 text-green-700'
								: 'border-gray-200 text-gray-600 active:bg-gray-50'}"
					>
						{cat}
					</button>
				{/each}
			</div>
			{#if categories.list.length === 0}
				<p class="mt-2 text-xs text-gray-400">No categories yet. Add one in Products → Categories.</p>
			{/if}
		</div>

		<!-- Pricing mode -->
		<div>
			<p class="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Pricing</p>
			
			<!-- Open pricing toggle -->
			<div class="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 mb-3">
				<div>
					<p class="text-sm font-medium text-gray-800">Open pricing</p>
					<p class="text-xs text-gray-400">Price is entered during the sale. Use for ice bags and similar.</p>
				</div>
				<button
					role="switch"
					aria-checked={pricingMode === 'open'}
					onclick={() => {
						if (pricingMode === 'open') {
							// Switch back to per_sale by default
							pricingMode = 'per_sale';
						} else {
							pricingMode = 'open';
						}
					}}
					class="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors
						{pricingMode === 'open' ? 'bg-green-500' : 'bg-gray-300'}"
				>
					<span class="sr-only">Open pricing</span>
					<span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5
						{pricingMode === 'open' ? 'translate-x-5' : 'translate-x-0.5'}">
					</span>
				</button>
			</div>

			<!-- Tabs for per sale and per bundle (hidden when open pricing is on) -->
			{#if pricingMode !== 'open'}
				<div class="flex rounded-xl overflow-hidden border border-gray-200">
					<button
						onclick={() => pricingMode = 'per_sale'}
						class="flex-1 py-2.5 text-sm font-medium transition
							{pricingMode === 'per_sale' ? 'bg-green-600 text-white' : 'bg-white text-gray-600'}"
					>
						Per sale
					</button>
					<button
						onclick={() => pricingMode = 'per_bundle'}
						class="flex-1 py-2.5 text-sm font-medium transition
							{pricingMode === 'per_bundle' ? 'bg-green-600 text-white' : 'bg-white text-gray-600'}"
					>
						Per bundle
					</button>
				</div>
				<p class="mt-1.5 text-xs text-gray-400">
					{#if pricingMode === 'per_sale'}
						Total = ⌈unit price × quantity⌉. Use for most products (ceiling rounding always applied).
					{:else if pricingMode === 'per_bundle'}
						Bundle pricing: buy {bundleQuantity || 'N'} units for ₱{bundlePrice || '0'}. Use for bulk discounts.
					{/if}
				</p>
			{/if}
		</div>

		<!-- Price + unit label — hidden for open pricing -->
		{#if pricingMode !== 'open'}
			<div class="flex gap-3">
				<div class="flex-1">
					<label for="product-unit-price" class="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
						Unit price (₱)
					</label>
					<input
						id="product-unit-price"
						type="number"
						inputmode="decimal"
						min="0"
						step="0.01"
						bind:value={price}
						placeholder="0"
						class="w-full rounded-xl border px-4 py-3 text-base outline-none
							{errors.price ? 'border-red-400' : 'border-gray-200 focus:border-green-500'}"
					/>
					{#if errors.price}<p class="mt-1 text-xs text-red-500">{errors.price}</p>{/if}
				</div>
				<div class="w-28">
					<label for="product-unit-label" class="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
						Unit label
					</label>
					<input
						id="product-unit-label"
						type="text"
						bind:value={unitLabel}
						placeholder="pc, sachet…"
						class="w-full rounded-xl border border-gray-200 px-4 py-3 text-base
							outline-none focus:border-green-500"
					/>
				</div>
			</div>

			<!-- Bundle fields — only for per_bundle pricing -->
			{#if pricingMode === 'per_bundle'}
				<div class="flex gap-3">
					<div class="flex-1">
						<label for="product-bundle-qty" class="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
							Bundle quantity
						</label>
						<input
							id="product-bundle-qty"
							type="number"
							inputmode="numeric"
							min="1"
							step="1"
							bind:value={bundleQuantity}
							placeholder="e.g. 12"
							class="w-full rounded-xl border px-4 py-3 text-base outline-none
								{errors.bundleQuantity ? 'border-red-400' : 'border-gray-200 focus:border-green-500'}"
						/>
						{#if errors.bundleQuantity}<p class="mt-1 text-xs text-red-500">{errors.bundleQuantity}</p>{/if}
					</div>
					<div class="flex-1">
						<label for="product-bundle-price" class="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
							Bundle price (₱)
						</label>
						<input
							id="product-bundle-price"
							type="number"
							inputmode="decimal"
							min="0"
							step="0.01"
							bind:value={bundlePrice}
							placeholder="0"
							class="w-full rounded-xl border px-4 py-3 text-base outline-none
								{errors.bundlePrice ? 'border-red-400' : 'border-gray-200 focus:border-green-500'}"
						/>
						{#if errors.bundlePrice}<p class="mt-1 text-xs text-red-500">{errors.bundlePrice}</p>{/if}
					</div>
				</div>
			{/if}
		{/if}

		<!-- Track stock — locked off for open pricing -->
		<div class="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3
			{pricingMode === 'open' ? 'opacity-40' : ''}">
			<div>
				<p class="text-sm font-medium text-gray-800">Track stock</p>
				<p class="text-xs text-gray-400">
					{pricingMode === 'open'
						? 'Not applicable for open-priced products.'
						: 'Off for load, ice, and items you can\'t count.'}
				</p>
			</div>
			<button
				role="switch"
				aria-checked={trackStock}
				disabled={pricingMode === 'open'}
				onclick={() => trackStock = !trackStock}
				class="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors
					{trackStock ? 'bg-green-500' : 'bg-gray-300'}"
			>
				<span class="sr-only">Track stock</span>
				<span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5
					{trackStock ? 'translate-x-5' : 'translate-x-0.5'}">
				</span>
			</button>
		</div>

		<!-- Deposit — hidden for open pricing -->
		{#if pricingMode !== 'open'}
			<div>
				<label for="product-deposit" class="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
					Bottle deposit (₱) — optional
				</label>
				<input
					id="product-deposit"
					type="number"
					inputmode="decimal"
					min="0"
					step="0.5"
					bind:value={depositAmount}
					placeholder="Leave blank if none"
					class="w-full rounded-xl border px-4 py-3 text-base outline-none
						{errors.depositAmount ? 'border-red-400' : 'border-gray-200 focus:border-green-500'}"
				/>
				{#if errors.depositAmount}
					<p class="mt-1 text-xs text-red-500">{errors.depositAmount}</p>
				{/if}
				<p class="mt-1 text-xs text-gray-400">
					If set, sales screen will show a deposit toggle for this product.
				</p>
			</div>

			<!-- Discount -->
			<div>
				<label for="product-discount" class="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
					Allowed discount (₱) — optional
				</label>
				<input
					id="product-discount"
					type="number"
					inputmode="decimal"
					min="0"
					step="1"
					bind:value={discountAmount}
					placeholder="Leave blank if none"
					class="w-full rounded-xl border px-4 py-3 text-base outline-none
						{errors.discountAmount ? 'border-red-400' : 'border-gray-200 focus:border-green-500'}"
				/>
				{#if errors.discountAmount}
					<p class="mt-1 text-xs text-red-500">{errors.discountAmount}</p>
				{/if}
				<p class="mt-1 text-xs text-gray-400">
					If set, sales screen will show a discount button for this product.
				</p>
			</div>
		{/if}

	</div>
</div>