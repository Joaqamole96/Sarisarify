<script lang="ts">
	import { page } from '$app/stores';
	import { borrows } from '$lib/stores/borrows.svelte.ts';
	import { toast } from '$lib/stores/toast.svelte.ts';
	import RecordPaymentSheet from '$lib/components/RecordPaymentSheet.svelte';
	import type { BorrowRecord } from '$lib/types';

	let borrowerId = $derived($page.params.borrowerId);

	let borrowerName = $state<string>('');
	let list = $state<BorrowRecord[]>([]);

	let recordingTarget = $state<BorrowRecord | null>(null);
	let savingPayment = $state(false);

	function formatPeso(n: number): string {
		return `₱${n % 1 === 0 ? n : n.toFixed(2)}`;
	}

	function statusBadge(status: BorrowRecord['status']): { label: string; cls: string } {
		if (status === 'paid') return { label: 'Paid', cls: 'bg-gray-100 text-gray-600' };
		if (status === 'partial') return { label: 'Partial', cls: 'bg-amber-100 text-amber-700' };
		return { label: 'Unpaid', cls: 'bg-red-100 text-red-700' };
	}

	$effect(() => {
		const unsub = borrows.listenBorrowerBorrows(borrowerId, (rows) => {
			list = rows;
			borrowerName = rows[0]?.borrowerName ?? borrowerName;
		});
		return () => unsub();
	});

	async function handleRecordPayment(params: { amount: number; note?: string }) {
		if (!recordingTarget || savingPayment) return;
		savingPayment = true;
		try {
			await borrows.recordPayment({
				borrowId: recordingTarget.id,
				borrowerId: recordingTarget.borrowerId,
				borrowerName: recordingTarget.borrowerName,
				currentRemainingAmount: recordingTarget.remainingAmount,
				amount: params.amount,
				note: params.note
			});
			toast.show('Payment recorded');
			recordingTarget = null;
		} finally {
			savingPayment = false;
		}
	}
</script>

<div class="mx-auto flex h-full w-full max-w-5xl flex-col">
	<header class="flex items-center gap-3 border-b border-gray-100 px-4 py-4">
		<a
			href="/borrows"
			class="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700 active:bg-gray-200"
			aria-label="Back to Borrows"
		>
			<span class="text-lg">←</span>
		</a>
		<div class="min-w-0">
			<h1 class="truncate text-base font-bold text-gray-900">{borrowerName || 'Borrower'}</h1>
			<p class="text-xs text-gray-400">{list.length} record{list.length !== 1 ? 's' : ''}</p>
		</div>
	</header>

	<div class="flex-1 overflow-y-auto">
		{#if list.length === 0}
			<div class="flex flex-col items-center justify-center gap-3 px-8 py-24 text-center">
				<span class="text-5xl">📋</span>
				<p class="text-base font-medium text-gray-700">No borrow records</p>
				<p class="text-sm text-gray-400">This borrower has no utang history yet.</p>
			</div>
		{:else}
			<ul>
				{#each list as b (b.id)}
					{@const badge = statusBadge(b.status)}
					<li class="border-b border-gray-100 px-4 py-3">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<span class="rounded-full px-2 py-0.5 text-xs font-semibold {badge.cls}">
										{badge.label}
									</span>
									<p class="text-sm font-semibold text-gray-900">
										Remaining {formatPeso(b.remainingAmount ?? 0)}
									</p>
									<p class="text-xs text-gray-400">
										(Original {formatPeso(b.originalAmount ?? 0)})
									</p>
								</div>
								{#if b.note}
									<p class="mt-1 text-xs text-gray-500">{b.note}</p>
								{/if}
							</div>

							<button
								disabled={b.status === 'paid'}
								onclick={() => recordingTarget = b}
								class="flex-shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold
									text-gray-700 active:bg-gray-50 disabled:opacity-40"
							>
								Pay
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

{#if recordingTarget}
	<RecordPaymentSheet
		borrow={recordingTarget}
		onConfirm={handleRecordPayment}
		onCancel={() => savingPayment ? null : (recordingTarget = null)}
	/>
{/if}

