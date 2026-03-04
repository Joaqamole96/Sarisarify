<script lang="ts">
	import { salesHistory } from '$lib/stores/salesHistory.svelte.ts';

	function formatPeso(n: number): string {
		return `₱${n % 1 === 0 ? n : n.toFixed(2)}`;
	}

	function formatDate(d: unknown): string {
		// Firestore Timestamp has toDate(); fallback to string.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const ts: any = d;
		try {
			if (ts?.toDate) return ts.toDate().toLocaleString();
		} catch {
			// ignore
		}
		return '';
	}
</script>

<div class="mx-auto flex h-full w-full max-w-5xl flex-col">
	<header class="flex items-center justify-between border-b border-gray-100 px-4 py-4">
		<div>
			<h1 class="text-lg font-bold text-gray-900">Stats</h1>
			<p class="text-xs text-gray-400">Sales log (latest first)</p>
		</div>
	</header>

	<div class="flex-1 overflow-y-auto">
		{#if salesHistory.list.length === 0}
			<div class="flex flex-col items-center justify-center gap-3 px-8 py-24 text-center">
				<span class="text-5xl">📊</span>
				<p class="text-base font-medium text-gray-700">No sales yet</p>
				<p class="text-sm text-gray-400">Confirm a sale in the Sales tab to see it here.</p>
			</div>
		{:else}
			<ul>
				{#each salesHistory.list as sale (sale.id)}
					<li class="border-b border-gray-100 px-4 py-3">
						<a href={`/stats/${sale.id}`} class="block">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="truncate text-sm font-semibold text-gray-900">
										{formatPeso(sale.total ?? 0)}
										{#if sale.borrowAmount > 0 && sale.borrowerName}
											<span class="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
												Utang · {sale.borrowerName}
											</span>
										{/if}
									</p>
									<p class="mt-0.5 text-xs text-gray-400">
										{formatDate(sale.createdAt)}
										{#if sale.items?.length}
											<span class="mx-1 text-gray-300">·</span>
											{sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
										{/if}
									</p>
									{#if sale.note}
										<p class="mt-1 truncate text-xs text-gray-500">Note: {sale.note}</p>
									{/if}
								</div>
								<span class="pt-0.5 text-gray-300">›</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

