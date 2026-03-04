<script lang="ts">
	import type { BorrowRecord } from '$lib/types';

	interface Props {
		borrow: BorrowRecord;
		onConfirm: (params: { amount: number; note?: string }) => void;
		onCancel: () => void;
	}

	let { borrow, onConfirm, onCancel }: Props = $props();

	let amountInput = $state('');
	let noteVisible = $state(false);
	let note = $state('');

	let amountParsed = $derived(parseFloat(String(amountInput)) || 0);
	let amountClamped = $derived(Math.min(Math.max(amountParsed, 0), Math.max(0, borrow.remainingAmount ?? 0)));

	let canConfirm = $derived(amountClamped > 0);

	function formatPeso(n: number): string {
		return `₱${n % 1 === 0 ? n : n.toFixed(2)}`;
	}

	function handleConfirm() {
		if (!canConfirm) return;
		onConfirm({ amount: amountClamped, note: note.trim() || undefined });
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
	<div
		class="w-full max-w-sm overflow-y-auto rounded-t-2xl bg-emerald-50 px-5 pb-8 pt-5"
		style="max-height: 92dvh;"
		role="presentation"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200"></div>

		<h2 class="mb-4 text-base font-bold text-gray-900">Record payment</h2>

		<div class="mb-4 rounded-xl bg-gray-50 px-4 py-3">
			<p class="text-sm font-medium text-gray-900">{borrow.borrowerName}</p>
			<p class="mt-0.5 text-xs text-gray-500">
				Remaining: <strong>{formatPeso(borrow.remainingAmount ?? 0)}</strong>
				<span class="mx-1 text-gray-300">·</span>
				Original: {formatPeso(borrow.originalAmount ?? 0)}
			</p>
		</div>

		<label for="borrow-payment-amount" class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
			Payment amount
		</label>
		<div class="relative mb-3">
			<span class="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-400">₱</span>
			<input
				id="borrow-payment-amount"
				type="number"
				min="0"
				step="1"
				inputmode="numeric"
				placeholder={String(borrow.remainingAmount ?? 0)}
				bind:value={amountInput}
				class="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-9 pr-4
					text-xl font-semibold text-gray-900 focus:border-green-500 focus:outline-none
					focus:ring-2 focus:ring-green-100"
			/>
		</div>

		{#if !noteVisible}
			<button
				onclick={() => noteVisible = true}
				class="mb-5 text-sm text-gray-400 underline-offset-2 active:text-gray-600"
			>
				+ Add note
			</button>
		{:else}
			<label for="borrow-payment-note" class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
				Note <span class="normal-case text-gray-400">(optional)</span>
			</label>
			<textarea
				id="borrow-payment-note"
				bind:value={note}
				rows="2"
				placeholder="e.g. Paid after work…"
				class="mb-5 w-full resize-none rounded-xl border border-gray-200 bg-gray-50
					px-4 py-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none
					focus:ring-2 focus:ring-green-100"
			></textarea>
		{/if}

		<div class="flex gap-3">
			<button
				onclick={onCancel}
				class="flex-1 rounded-xl border border-gray-200 py-3.5 text-sm font-medium text-gray-700 active:bg-gray-50"
			>
				Back
			</button>
			<button
				onclick={handleConfirm}
				disabled={!canConfirm}
				class="flex-1 rounded-xl bg-green-600 py-3.5 text-sm font-semibold text-white
					active:bg-green-700 disabled:opacity-40"
			>
				Record · {formatPeso(amountClamped)}
			</button>
		</div>
	</div>
</div>

