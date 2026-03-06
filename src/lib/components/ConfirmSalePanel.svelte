<script lang="ts">
	import { borrowers } from '$lib/stores/borrowers.svelte.ts';
	import type { Borrower } from '$lib/types';

	interface Props {
		total: number;
		onConfirm: (params: {
			cashCollected: number;
			borrowerId?: string;
			borrowerName?: string;
			note?: string;
		}) => void;
	}

	let { total, onConfirm }: Props = $props();

	let expanded = $state(false);
	let cashInput = $state('');

	let cashParsed = $derived(String(cashInput).trim() === '' ? total : (parseFloat(cashInput) || 0));
	let cashClamped = $derived(Math.min(Math.max(cashParsed, 0), total));
	let borrowAmount = $derived(String(cashInput).trim() === '' ? 0 : Math.max(0, total - cashParsed));
	let changeAmount = $derived(cashParsed > total ? cashParsed - total : 0);

	// Auto-expand when a borrow is required — borrower selection cannot be skipped
	$effect(() => {
		if (borrowAmount > 0) expanded = true;
	});

	type BorrowerMode = 'existing' | 'new' | null;
	let borrowerMode = $state<BorrowerMode>(null);
	let selectedBorrower = $state<Borrower | null>(null);
	let newBorrowerName = $state('');
	let hasOutstanding = $state(false);
	let checkingBalance = $state(false);
	let savingBorrower = $state(false);

	let noteVisible = $state(false);
	let note = $state('');

	$effect(() => {
		if (borrowAmount <= 0) {
			borrowerMode = null;
			selectedBorrower = null;
			newBorrowerName = '';
			hasOutstanding = false;
		}
	});

	async function selectBorrower(borrower: Borrower) {
		selectedBorrower = borrower;
		hasOutstanding = false;
		checkingBalance = true;
		try {
			hasOutstanding = await borrowers.hasOutstandingBalance(borrower.id);
		} finally {
			checkingBalance = false;
		}
	}

	let canConfirm = $derived(
		cashParsed >= 0 &&
		(borrowAmount <= 0 ||
			(borrowerMode === 'existing' && selectedBorrower !== null) ||
			(borrowerMode === 'new' && newBorrowerName.trim().length > 0))
	);

	async function handleConfirm() {
		if (!canConfirm || savingBorrower) return;

		let borrowerId: string | undefined;
		let borrowerName: string | undefined;

		if (borrowAmount > 0) {
			if (borrowerMode === 'new') {
				savingBorrower = true;
				try {
					borrowerId = await borrowers.add({ name: newBorrowerName.trim() });
					borrowerName = newBorrowerName.trim();
				} finally {
					savingBorrower = false;
				}
			} else if (borrowerMode === 'existing' && selectedBorrower) {
				borrowerId = selectedBorrower.id;
				borrowerName = selectedBorrower.name;
			}
		}

		onConfirm({
			cashCollected: cashClamped,
			borrowerId,
			borrowerName,
			note: note.trim() || undefined
		});

		// Reset for next sale
		cashInput = '';
		expanded = false;
		noteVisible = false;
		note = '';
	}

	function formatPeso(n: number): string {
		return `₱${n % 1 === 0 ? n : n.toFixed(2)}`;
	}
</script>

<div class="border-t border-emerald-100 bg-emerald-50">

	<!-- Drag handle + collapsed summary row -->
	<button
		onclick={() => expanded = !expanded}
		class="flex w-full items-center justify-between px-4 py-2"
	>
		<div class="flex flex-col gap-0.5">
			<span class="block h-0.5 w-5 rounded-full bg-emerald-300"></span>
			<span class="block h-0.5 w-5 rounded-full bg-emerald-300"></span>
		</div>
		<span class="text-xs font-medium text-gray-500">
			{expanded ? 'Hide details' : 'Show details'}
		</span>
		<span class="text-base font-bold text-gray-900">{formatPeso(total)}</span>
	</button>

	{#if expanded}
		<div class="px-3 pb-3">
			<!-- Total row -->
			<div class="mb-2 flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
				<span class="text-xs font-medium uppercase tracking-wide text-gray-500">Total</span>
				<span class="text-base font-bold text-gray-900">{formatPeso(total)}</span>
			</div>

			<!-- Cash received -->
			<label for="sale-cash-received" class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
				Cash received
				<span class="ml-1 font-normal normal-case text-gray-400">— blank = exact</span>
			</label>
			<div class="relative mb-2">
				<span class="absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-gray-400">₱</span>
				<input
					id="sale-cash-received"
					type="number"
					min="0"
					step="1"
					inputmode="numeric"
					placeholder={String(total)}
					bind:value={cashInput}
					class="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-8 pr-3
						text-lg font-semibold text-gray-900 focus:border-green-500 focus:outline-none
						focus:ring-2 focus:ring-green-100"
				/>
			</div>

			{#if changeAmount > 0}
				<div class="mb-2 flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-3 py-2">
					<span class="text-sm font-medium text-green-800">Change</span>
					<span class="text-sm font-bold text-green-700">{formatPeso(changeAmount)}</span>
				</div>
			{/if}

			{#if borrowAmount > 0}
				<div class="mb-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
					<span class="text-sm font-medium text-amber-800">Borrow (utang)</span>
					<span class="text-sm font-bold text-amber-700">{formatPeso(borrowAmount)}</span>
				</div>

				<p class="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">Borrower</p>

				<div class="mb-2 flex gap-2">
					<button
						onclick={() => { borrowerMode = 'existing'; selectedBorrower = null; hasOutstanding = false; }}
						class="flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors
							{borrowerMode === 'existing'
								? 'border-green-500 bg-green-50 text-green-700'
								: 'border-gray-200 text-gray-600 active:bg-gray-50'}"
					>
						Existing
					</button>
					<button
						onclick={() => { borrowerMode = 'new'; selectedBorrower = null; hasOutstanding = false; }}
						class="flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors
							{borrowerMode === 'new'
								? 'border-green-500 bg-green-50 text-green-700'
								: 'border-gray-200 text-gray-600 active:bg-gray-50'}"
					>
						Add New
					</button>
				</div>

				{#if borrowerMode === 'existing'}
					{#if borrowers.list.length === 0}
						<p class="mb-3 rounded-xl bg-white/70 px-4 py-3 text-sm text-gray-400">
							No borrowers yet. Use "Add New" to create one.
						</p>
					{:else}
						<div class="mb-2 max-h-32 overflow-y-auto rounded-xl border border-gray-100 bg-white">
							{#each borrowers.list as borrower (borrower.id)}
								<button
									onclick={() => selectBorrower(borrower)}
									class="flex w-full items-center justify-between border-b border-gray-100
										px-3 py-2.5 text-left last:border-b-0 active:bg-gray-50
										{selectedBorrower?.id === borrower.id ? 'bg-green-50' : ''}"
								>
									<span class="text-sm font-medium text-gray-900">{borrower.name}</span>
									{#if selectedBorrower?.id === borrower.id}
										<svg class="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/>
										</svg>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				{/if}

				{#if borrowerMode === 'new'}
					<input
						type="text"
						placeholder="Borrower's name"
						bind:value={newBorrowerName}
						class="mb-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5
							text-sm text-gray-900 focus:border-green-500 focus:outline-none
							focus:ring-2 focus:ring-green-100"
					/>
				{/if}

				{#if checkingBalance}
					<p class="mb-3 text-xs text-gray-400">Checking balance…</p>
				{:else if hasOutstanding}
					<div class="mb-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
						<svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
						</svg>
						<p class="text-xs text-amber-700">
							<strong>{selectedBorrower?.name}</strong> already has an outstanding balance.
						</p>
					</div>
				{/if}
			{/if}

			<!-- Note -->
			{#if !noteVisible}
				<button
					onclick={() => noteVisible = true}
					class="mb-2 text-sm text-gray-400 underline-offset-2 active:text-gray-600"
				>
					+ Add note
				</button>
			{:else}
				<label for="sale-note" class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
					Note <span class="normal-case text-gray-400">(optional)</span>
				</label>
				<textarea
					id="sale-note"
					bind:value={note}
					rows="2"
					placeholder="e.g. Bought for fiesta, half-pack cigarettes…"
					class="mb-2 w-full resize-none rounded-xl border border-gray-200 bg-white
						px-3 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none
						focus:ring-2 focus:ring-green-100"
				></textarea>
			{/if}
		</div>
	{/if}

	<!-- Confirm button — always visible -->
	<div class="px-3 pb-3">
		<button
			onclick={handleConfirm}
			disabled={!canConfirm || savingBorrower}
			class="flex w-full items-center justify-center rounded-xl bg-green-600 py-3 text-sm
				font-semibold text-white active:bg-green-700 disabled:opacity-40"
		>
			{#if savingBorrower}
				Saving…
			{:else if borrowAmount > 0}
				Confirm · {formatPeso(borrowAmount)} utang
			{:else}
				Confirm Sale · {formatPeso(total)}
			{/if}
		</button>
	</div>
</div>