<script lang="ts">
	import { borrows } from '$lib/stores/borrows.svelte.ts';
	import { borrowers } from '$lib/stores/borrowers.svelte.ts';
	import { toast } from '$lib/stores/toast.svelte.ts';
	import type { Borrower } from '$lib/types';

	let showAllBorrowers = $state(false);
	let addingNew = $state(false);
	let newName = $state('');
	let renamingId = $state<string | null>(null);
	let renameDraft = $state('');
	let deleteTarget = $state<Borrower | null>(null);
	let deleteOutstanding = $state(0);
	let checkingDelete = $state(false);

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

	async function handleAdd() {
		const name = newName.trim();
		if (!name) return;
		await borrowers.add({ name });
		newName = '';
		addingNew = false;
		toast.show(`${name} added`);
	}

	function startRename(b: Borrower) {
		renamingId = b.id;
		renameDraft = b.name;
	}

	function cancelRename() {
		renamingId = null;
		renameDraft = '';
	}

	async function confirmRename() {
		if (!renamingId || !renameDraft.trim()) return;
		await borrowers.rename(renamingId, renameDraft.trim());
		cancelRename();
		toast.show('Borrower renamed');
	}

	async function openDelete(b: Borrower) {
		checkingDelete = true;
		deleteTarget = b;
		deleteOutstanding = await borrowers.outstandingTotal(b.id);
		checkingDelete = false;
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		const name = deleteTarget.name;
		await borrowers.remove(deleteTarget.id);
		deleteTarget = null;
		deleteOutstanding = 0;
		toast.show(`${name} deleted`, 'info');
	}
</script>

<div class="mx-auto flex h-full w-full max-w-5xl flex-col">
	<header class="flex items-center justify-between border-b border-emerald-100 bg-emerald-50 px-4 py-4">
		<div>
			<h1 class="text-lg font-bold text-gray-900">Borrows</h1>
			<p class="text-xs text-gray-400">
				{outstandingRows.length} borrower{outstandingRows.length !== 1 ? 's' : ''} with outstanding utang
			</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				onclick={() => { addingNew = !addingNew; newName = ''; }}
				class="rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white active:bg-green-700"
			>
				+ Add
			</button>
			<button
				onclick={() => showAllBorrowers = !showAllBorrowers}
				class="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 active:bg-gray-100"
			>
				{showAllBorrowers ? 'Hide paid' : 'Show all'}
			</button>
		</div>
	</header>

	{#if addingNew}
		<div class="border-b border-gray-100 bg-white px-4 py-3">
			<p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">New borrower</p>
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={newName}
					placeholder="Borrower's name"
					class="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm
						text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
				/>
				<button
					onclick={handleAdd}
					class="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white active:bg-green-700"
				>
					Save
				</button>
				<button
					onclick={() => { addingNew = false; newName = ''; }}
					class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 active:bg-gray-50"
				>
					Cancel
				</button>
			</div>
		</div>
	{/if}

	<div class="flex-1 overflow-y-auto">
		{#if rows.length === 0}
			<div class="flex flex-col items-center justify-center gap-3 px-8 py-24 text-center">
				<span class="text-5xl">✅</span>
				<p class="text-base font-medium text-gray-700">No outstanding borrows</p>
				<p class="text-sm text-gray-400">You're all caught up.</p>
			</div>
		{:else}
			<ul>
				{#each rows as r (r.borrowerId)}
					{@const borrower = borrowers.list.find((b) => b.id === r.borrowerId)}
					<li class="border-b border-gray-100 px-4 py-3">
						{#if renamingId === r.borrowerId}
							<div class="flex items-center gap-2">
								<input
									type="text"
									bind:value={renameDraft}
									class="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm
										text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
								/>
								<button
									onclick={confirmRename}
									class="rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white active:bg-green-700"
								>
									Save
								</button>
								<button
									onclick={cancelRename}
									class="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 active:bg-gray-50"
								>
									Cancel
								</button>
							</div>
						{:else}
							<div class="flex items-center gap-3">
								<a class="min-w-0 flex-1" href={`/borrows/${r.borrowerId}`}>
									<p class="truncate text-sm font-semibold text-gray-900">{r.borrowerName}</p>
									<p class="text-sm font-bold {r.outstanding > 0 ? 'text-amber-700' : 'text-gray-300'}">
										{formatPeso(r.outstanding)}
									</p>
								</a>
								{#if borrower}
									<button
										onclick={() => startRename(borrower)}
										class="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 active:bg-gray-50"
									>
										Rename
									</button>
									<button
										onclick={() => openDelete(borrower)}
										class="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 active:bg-red-50 active:text-red-600"
									>
										Delete
									</button>
								{/if}
								<span class="flex h-8 w-8 items-center justify-center text-gray-300">›</span>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

{#if deleteTarget}
	<div class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
		<div class="w-full max-w-sm rounded-2xl bg-white p-6">
			<p class="text-base font-semibold text-gray-900">Delete "{deleteTarget.name}"?</p>
			{#if checkingDelete}
				<p class="mt-2 text-sm text-gray-400">Checking balance…</p>
			{:else if deleteOutstanding > 0}
				<p class="mt-2 text-sm text-gray-500">
					This borrower has <span class="font-semibold text-amber-600">{formatPeso(deleteOutstanding)} outstanding utang</span>.
					Their borrow records will be kept but the borrower profile will be removed.
				</p>
			{:else}
				<p class="mt-2 text-sm text-gray-500">
					Their borrow history will be kept but the borrower profile will be removed. This cannot be undone.
				</p>
			{/if}
			<div class="mt-5 flex gap-3">
				<button
					onclick={() => { deleteTarget = null; deleteOutstanding = 0; }}
					class="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 active:bg-gray-50"
				>
					Cancel
				</button>
				<button
					onclick={confirmDelete}
					disabled={checkingDelete}
					class="flex-1 rounded-xl bg-red-500 py-3 text-sm font-semibold text-white active:bg-red-600 disabled:opacity-40"
				>
					Delete
				</button>
			</div>
		</div>
	</div>
{/if}