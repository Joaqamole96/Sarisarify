<script lang="ts">
	import { borrows } from '$lib/stores/borrows.svelte.ts';
	import { borrowers } from '$lib/stores/borrowers.svelte.ts';

	let showAllBorrowers = $state(false);

	function formatPeso(n: number): string {
		return `₱${n % 1 === 0 ? n : n.toFixed(2)}`;
	}

	let outstandingRows = $derived(borrows.borrowerBalances);

	let rows = $derived(
		(() => {
			if (!showAllBorrowers) return outstandingRows;
			const byId = new Map(outstandingRows.map((r) => [r.borrowerId, r]));
			return borrowers.list
				.map((b) => {
					const existing = byId.get(b.id);
					return existing ?? { borrowerId: b.id, borrowerName: b.name, outstanding: 0 };
				})
				.sort((a, b) => b.outstanding - a.outstanding);
		})()
	);
</script>

<div class="mx-auto flex h-full w-full max-w-5xl flex-col">
	<header class="flex items-center justify-between border-b border-gray-100 px-4 py-4">
		<div>
			<h1 class="text-lg font-bold text-gray-900">Borrows</h1>
			<p class="text-xs text-gray-400">
				{outstandingRows.length} borrower{outstandingRows.length !== 1 ? 's' : ''} with outstanding utang
			</p>
		</div>
		<button
			onclick={() => showAllBorrowers = !showAllBorrowers}
			class="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 active:bg-gray-200"
		>
			{showAllBorrowers ? 'Hide paid' : 'Show all'}
		</button>
	</header>

	<div class="flex-1 overflow-y-auto">
		{#if rows.length === 0}
			<div class="flex flex-col items-center justify-center gap-3 px-8 py-24 text-center">
				<span class="text-5xl">✅</span>
				<p class="text-base font-medium text-gray-700">No outstanding borrows</p>
				<p class="text-sm text-gray-400">You’re all caught up.</p>
			</div>
		{:else}
			<ul>
				{#each rows as r (r.borrowerId)}
					<li class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
						<a class="min-w-0 flex-1" href={`/borrows/${r.borrowerId}`}>
							<p class="truncate text-sm font-semibold text-gray-900">{r.borrowerName}</p>
							<p class="text-sm font-bold {r.outstanding > 0 ? 'text-amber-700' : 'text-gray-300'}">
								{formatPeso(r.outstanding)}
							</p>
						</a>
						<span class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-300">
							›
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

