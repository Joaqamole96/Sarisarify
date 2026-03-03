<script lang="ts">
	import { PRODUCT_ICONS, DEFAULT_ICON } from '$lib/icons';
	import { PRODUCT_CATEGORIES } from '$lib/types';
	import type { Product, NewProduct, PricingMode, ProductCategory } from '$lib/types';

	interface Props {
		product?: Product;
		onSave: (data: NewProduct) => Promise<void>;
		onCancel: () => void;
	}

	let { product, onSave, onCancel }: Props = $props();

	let name           = $state(product?.name            ?? '');
	let price          = $state(product?.price            ?? '');
	let pricingMode    = $state<PricingMode>(product?.pricingMode   ?? 'per_sale');
	let unitLabel      = $state(product?.unitLabel        ?? '');
	let iconEmoji      = $state(product?.iconEmoji        ?? DEFAULT_ICON);
	let category       = $state<ProductCategory>(product?.category  ?? PRODUCT_CATEGORIES[0]);
	let trackStock     = $state(product?.trackStock       ?? true);
	let depositAmount  = $state(product?.depositAmount    ?? '');
	let discountAmount = $state(product?.discountAmount   ?? '');
	let bundleQuantity = $state(product?.bundleQuantity   ?? '');
	let bundlePrice    = $state(product?.bundlePrice      ?? '');

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
				iconEmoji,
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

	const isEditing = !!product;
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
			<div class="flex flex-wrap gap-2">
				{#each PRODUCT_ICONS as emoji}
					<button
						onclick={() => iconEmoji = emoji}
						class="flex h-10 w-10 items-center justify-center rounded-xl text-xl transition
							{iconEmoji === emoji ? 'bg-green-100 ring-2 ring-green-500' : 'bg-gray-100'}"
					>
						{emoji}
					</button>
				{/each}
			</div>
		</div>

		<!-- Name -->
		<div>
			<label class="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
				Product name
			</label>
			<input
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
				{#each PRODUCT_CATEGORIES as cat}
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
					<label class="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
						Unit price (₱)
					</label>
					<input
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
					<label class="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
						Unit label
					</label>
					<input
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
						<label class="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
							Bundle quantity
						</label>
						<input
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
						<label class="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
							Bundle price (₱)
						</label>
						<input
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
				<label class="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
					Bottle deposit (₱) — optional
				</label>
				<input
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
				<label class="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
					Allowed discount (₱) — optional
				</label>
				<input
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