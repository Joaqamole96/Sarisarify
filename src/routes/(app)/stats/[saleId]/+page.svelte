<script lang="ts">
	import { page } from '$app/stores';
	import { salesHistory } from '$lib/stores/salesHistory.svelte.ts';
	import { toast } from '$lib/stores/toast.svelte.ts';
	import ProductIcon from '$lib/components/ProductIcon.svelte';
	import type { Sale, SaleLineItem } from '$lib/types';

	let saleId = $derived($page.params.saleId);

	let sale = $state<Sale | null>(null);
	let loading = $state(true);

	let noteDraft = $state('');
	let saving = $state(false);

	function formatPeso(n: number): string {
		return `₱${n % 1 === 0 ? n : n.toFixed(2)}`;
	}

	function formatDate(d: unknown): string {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const ts: any = d;
		try {
			if (ts?.toDate) return ts.toDate().toLocaleString();
		} catch {
			// ignore
		}
		return '';
	}

	function itemIcon(item: SaleLineItem): { iconKey?: string; iconEmoji?: string } {
		// Back-compat for older sales that stored only productEmoji.
		return {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			iconKey: (item as any).productIconKey,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			iconEmoji: (item as any).productEmoji
		};
	}

	$effect(() => {
		loading = true;
		salesHistory.getById(saleId).then((s) => {
			sale = s;
			noteDraft = s?.note ?? '';
			loading = false;
		});
	});

	async function saveNote() {
		if (!sale || saving) return;
		saving = true;
		try {
			await salesHistory.updateNote(sale.id, noteDraft.trim() || undefined);
			toast.show('Note saved');
		} finally {
			saving = false;
		}
	}
</script>

<div class="mx-auto flex h-full w-full max-w-5xl flex-col">
	<header class="flex items-center gap-3 border-b border-gray-100 px-4 py-4">
		<a
			href="/stats"
			class="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700 active:bg-gray-200"
			aria-label="Back to Stats"
		>
			<span class="text-lg">←</span>
		</a>
		<div class="min-w-0">
			<h1 class="truncate text-base font-bold text-gray-900">Sale</h1>
			<p class="text-xs text-gray-400">{sale ? formatDate(sale.createdAt) : ''}</p>
		</div>
	</header>

	<div class="flex-1 overflow-y-auto px-4 py-4">
		{#if loading}
			<p class="text-sm text-gray-400">Loading…</p>
		{:else if !sale}
			<div class="flex flex-col items-center justify-center gap-2 py-24 text-center">
				<p class="text-base font-medium text-gray-700">Sale not found</p>
				<p class="text-sm text-gray-400">It may not have synced yet.</p>
			</div>
		{:else}
			<div class="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
				<div class="flex items-center justify-between">
					<p class="text-xs text-gray-400">Total</p>
					<p class="text-lg font-bold text-gray-900">{formatPeso(sale.total ?? 0)}</p>
				</div>
				<div class="mt-2 flex items-center justify-between text-sm">
					<p class="text-gray-500">Cash</p>
					<p class="font-semibold text-gray-900">{formatPeso(sale.cashCollected ?? 0)}</p>
				</div>
				{#if (sale.borrowAmount ?? 0) > 0}
					<div class="mt-1 flex items-center justify-between text-sm">
						<p class="text-amber-700">Utang</p>
						<p class="font-semibold text-amber-700">{formatPeso(sale.borrowAmount ?? 0)}</p>
					</div>
					{#if sale.borrowerName}
						<p class="mt-1 text-xs text-gray-400">Borrower: {sale.borrowerName}</p>
					{/if}
				{/if}
			</div>

			<div class="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
				<p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Items</p>
				{#if !sale.items || sale.items.length === 0}
					<p class="text-sm text-gray-400">No items.</p>
				{:else}
					<ul class="flex flex-col gap-2">
						{#each sale.items as it, idx (idx)}
							{@const ic = itemIcon(it)}
							<li class="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2">
								<div class="flex min-w-0 items-center gap-2">
									<ProductIcon iconKey={ic.iconKey} iconEmoji={ic.iconEmoji} class="h-4 w-4 text-gray-900" />
									<p class="truncate text-sm font-medium text-gray-900">{it.productName}</p>
									<p class="text-xs text-gray-400">×{it.quantity}</p>
								</div>
								<p class="flex-shrink-0 text-sm font-semibold text-gray-900">{formatPeso(it.lineTotal ?? 0)}</p>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="rounded-2xl border border-gray-100 bg-white p-4">
				<label for="sale-note-edit" class="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
					Note
				</label>
				<textarea
					id="sale-note-edit"
					bind:value={noteDraft}
					rows="3"
					placeholder="Add a note for this sale…"
					class="mb-3 w-full resize-none rounded-xl border border-gray-200 bg-gray-50
						px-4 py-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none
						focus:ring-2 focus:ring-green-100"
				></textarea>
				<button
					onclick={saveNote}
					disabled={saving}
					class="w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white active:bg-green-700 disabled:opacity-40"
				>
					{saving ? 'Saving…' : 'Save note'}
				</button>
			</div>
		{/if}
	</div>
</div>

