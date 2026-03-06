<script lang="ts">
	import { categories } from '$lib/stores/categories.svelte.ts';
	import { toast } from '$lib/stores/toast.svelte.ts';
	import ProductIcon from '$lib/components/ProductIcon.svelte';
	import { PRODUCT_ICON_OPTIONS, type ProductIconKey } from '$lib/productIcons';

	let newName = $state('');
	let renamingId = $state<string | null>(null);
	let renameDraft = $state('');
	let iconTargetId = $state<string | null>(null);
	let iconDraft = $state<ProductIconKey[]>([]);

	async function addCategory() {
		const name = newName.trim();
		if (!name) return;
		await categories.add(name);
		newName = '';
		toast.show('Category added');
	}

	function startRename(id: string, name: string) {
		renamingId = id;
		renameDraft = name;
	}

	function cancelRename() {
		renamingId = null;
		renameDraft = '';
	}

	async function confirmRename(oldName: string) {
		const next = renameDraft.trim();
		if (!next) return;
		await categories.rename(oldName, next);
		cancelRename();
		toast.show('Category renamed');
	}

	async function removeCategory(name: string) {
		const res = await categories.remove(name);
		if (!res.ok && res.reason === 'in_use') {
			toast.show('Cannot delete: category is used by products', 'info');
			return;
		}
		if (res.ok) toast.show('Category deleted', 'info');
	}

	function openIcons(id: string) {
		iconTargetId = id;
		const current = categories.list.find((c) => c.id === id)?.iconKeys ?? [];
		iconDraft = [...current];
	}

	function closeIcons() {
		iconTargetId = null;
		iconDraft = [];
	}

	function toggleIcon(key: ProductIconKey) {
		if (iconDraft.includes(key)) iconDraft = iconDraft.filter((k) => k !== key);
		else iconDraft = [...iconDraft, key];
	}

	async function saveIcons() {
		if (!iconTargetId) return;
		await categories.setIconKeys(iconTargetId, iconDraft);
		toast.show('Category icons updated');
		closeIcons();
	}
</script>

<div class="mx-auto flex h-full w-full max-w-5xl flex-col">
	<header class="flex items-center gap-3 border-b border-gray-100 px-4 py-4">
		<a
			href="/products"
			class="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700 active:bg-gray-200"
			aria-label="Back to Products"
		>
			<span class="text-lg">←</span>
		</a>
		<div class="min-w-0">
			<h1 class="truncate text-base font-bold text-gray-900">Categories</h1>
			<p class="text-xs text-gray-400">{categories.list.length} total</p>
		</div>
	</header>

	<div class="flex-1 overflow-y-auto px-4 py-4">
		<div class="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
			<label for="new-category" class="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
				Add category
			</label>
			<div class="flex gap-2">
				<input
					id="new-category"
					type="text"
					bind:value={newName}
					placeholder="e.g. Rice, Frozen, Medicine…"
					class="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm
						text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
				/>
				<button
					onclick={addCategory}
					class="rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white active:bg-green-700"
				>
					Add
				</button>
			</div>
		</div>

		{#if categories.list.length === 0}
			<div class="flex flex-col items-center justify-center gap-2 py-16 text-center">
				<p class="text-base font-medium text-gray-700">No categories</p>
				<p class="text-sm text-gray-400">Add one above to get started.</p>
			</div>
		{:else}
			<ul class="rounded-2xl border border-gray-100 bg-white">
				{#each categories.list as c (c.id)}
					<li class="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 last:border-b-0">
						{#if renamingId === c.id}
							<div class="flex min-w-0 flex-1 items-center gap-2">
								<input
									type="text"
									bind:value={renameDraft}
									class="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm
										text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
								/>
								<button
									onclick={() => confirmRename(c.name)}
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
							<div class="flex min-w-0 flex-1 items-center gap-2">
								<span class="h-3 w-3 flex-shrink-0 rounded-full" style="background-color: {c.color}"></span>
								<p class="min-w-0 truncate text-sm font-semibold text-gray-900">{c.name}</p>
							</div>
							<div class="flex flex-shrink-0 gap-2">
								<button
									onclick={() => openIcons(c.id)}
									class="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 active:bg-gray-50"
								>
									Icons
								</button>
								<button
									onclick={() => startRename(c.id, c.name)}
									class="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 active:bg-gray-50"
								>
									Rename
								</button>
								<button
									onclick={() => removeCategory(c.name)}
									class="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 active:bg-gray-50"
								>
									Delete
								</button>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

{#if iconTargetId}
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
		role="button"
		tabindex="-1"
		onclick={closeIcons}
		onkeydown={(e) => e.key === 'Escape' && closeIcons()}
	>
		<div
			class="w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white px-5 pb-8 pt-5"
			style="max-height: 92dvh;"
			role="presentation"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200"></div>
			<h2 class="mb-4 text-base font-bold text-gray-900">Category icon options</h2>
			<p class="mb-4 text-sm text-gray-400">Pick which icons show up in “Suggested” for this category.</p>

			<div class="flex flex-wrap gap-2">
				{#each PRODUCT_ICON_OPTIONS as opt (opt.key)}
					<button
						onclick={() => toggleIcon(opt.key)}
						class="flex h-10 w-10 items-center justify-center rounded-xl transition
							{iconDraft.includes(opt.key) ? 'bg-green-100 ring-2 ring-green-500' : 'bg-gray-100'}"
						aria-label={opt.label}
						title={opt.label}
					>
						<ProductIcon iconKey={opt.key} class="h-5 w-5 text-gray-800" />
					</button>
				{/each}
			</div>

			<div class="mt-6 flex gap-3">
				<button
					onclick={closeIcons}
					class="flex-1 rounded-xl border border-gray-200 py-3.5 text-sm font-medium text-gray-700 active:bg-gray-50"
				>
					Cancel
				</button>
				<button
					onclick={saveIcons}
					class="flex-1 rounded-xl bg-green-600 py-3.5 text-sm font-semibold text-white active:bg-green-700"
				>
					Save
				</button>
			</div>
		</div>
	</div>
{/if}

