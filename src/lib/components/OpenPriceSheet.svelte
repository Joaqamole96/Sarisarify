<script lang="ts">
	import type { Product } from '$lib/types';

	interface Props {
		product: Product;
		onConfirm: (price: number) => void;
		onCancel: () => void;
	}

	let { product, onConfirm, onCancel }: Props = $props();

	let rawValue = $state('');

	// Only accept whole-peso amounts for ice — no fractional open pricing
	let parsed = $derived(parseInt(rawValue, 10));
	let valid  = $derived(!isNaN(parsed) && parsed > 0);

	function handleConfirm() {
		if (!valid) return;
		onConfirm(parsed);
		rawValue = '';
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && valid) handleConfirm();
		if (e.key === 'Escape') onCancel();
	}
</script>

<!-- Backdrop -->
<div
	class="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
	role="button"
	tabindex="-1"
	onclick={onCancel}
	onkeydown={(e) => e.key === 'Escape' && onCancel()}
>
	<!-- Sheet — stop propagation so clicks inside don't close -->
	<div
		class="w-full max-w-sm rounded-t-2xl bg-white px-5 pb-8 pt-5"
		role="presentation"
		onclick={(e) => e.stopPropagation()}
	>
		<!-- Handle -->
		<div class="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200"></div>

		<div class="mb-5 flex items-center gap-3">
			<span class="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-2xl">
				{product.iconEmoji}
			</span>
			<div>
				<p class="text-sm font-semibold text-gray-900">{product.name}</p>
				<p class="text-xs text-gray-400">Enter the amount for this sale</p>
			</div>
		</div>

		<!-- Price input -->
		<div class="relative mb-5">
			<span class="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-400">
				₱
			</span>
			<input
				type="number"
				min="1"
				step="1"
				inputmode="numeric"
				placeholder="0"
				bind:value={rawValue}
				onkeydown={handleKey}
				autofocus
				class="w-full rounded-xl border border-gray-200 bg-gray-50 py-4 pl-9 pr-4
					text-xl font-semibold text-gray-900 focus:border-green-500 focus:outline-none
					focus:ring-2 focus:ring-green-100"
			/>
		</div>

		<div class="flex gap-3">
			<button
				onclick={onCancel}
				class="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 active:bg-gray-50"
			>
				Cancel
			</button>
			<button
				onclick={handleConfirm}
				disabled={!valid}
				class="flex-1 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white
					active:bg-green-700 disabled:opacity-40"
			>
				Add to Sale
			</button>
		</div>
	</div>
</div>