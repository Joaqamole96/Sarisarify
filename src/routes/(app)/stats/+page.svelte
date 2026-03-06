<script lang="ts">
	import { salesHistory } from '$lib/stores/salesHistory.svelte.ts';

	type Period = 'day' | 'week' | 'month' | 'year';
	let period = $state<Period>('day');

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

	function startOf(p: Period): Date {
		const now = new Date();
		if (p === 'day') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
		if (p === 'week') {
			const dow = now.getDay(); // 0 = Sun
			const diff = dow === 0 ? 6 : dow - 1; // back to Monday
			return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
		}
		if (p === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
		return new Date(now.getFullYear(), 0, 1);
	}

	let periodSales = $derived.by(() => {
		const start = startOf(period);
		return salesHistory.list.filter((s) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const ts: any = s.createdAt;
			try {
				const d = ts?.toDate ? ts.toDate() : null;
				return d != null && d >= start;
			} catch {
				return false;
			}
		});
	});

	let periodTotal = $derived(periodSales.reduce((sum, s) => sum + (s.total ?? 0), 0));
	let periodBorrow = $derived(periodSales.reduce((sum, s) => sum + (s.borrowAmount ?? 0), 0));

	interface ProductStat {
		productId: string;
		productName: string;
		revenue: number;
		qty: number;
	}

	let topProducts = $derived.by(() => {
		const map = new Map<string, ProductStat>();
		for (const sale of periodSales) {
			for (const item of sale.items ?? []) {
				const existing = map.get(item.productId);
				if (existing) {
					existing.revenue += item.lineTotal ?? 0;
					existing.qty += item.quantity ?? 0;
				} else {
					map.set(item.productId, {
						productId: item.productId,
						productName: item.productName,
						revenue: item.lineTotal ?? 0,
						qty: item.quantity ?? 0
					});
				}
			}
		}
		return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
	});

	const PERIOD_LABELS: Record<Period, string> = {
		day: 'Today',
		week: 'This Week',
		month: 'This Month',
		year: 'This Year'
	};
</script>

<div class="mx-auto flex h-full w-full max-w-5xl flex-col">
	<header class="border-b border-gray-100 px-4 py-4">
		<h1 class="text-lg font-bold text-gray-900">Stats</h1>
		<div class="mt-3 flex gap-2">
			{#each (['day', 'week', 'month', 'year'] as Period[]) as tab}
				<button
					onclick={() => (period = tab)}
					class="flex-1 rounded-xl py-2 text-sm font-semibold transition-colors
						{period === tab
						? 'bg-green-600 text-white'
						: 'bg-gray-100 text-gray-600 active:bg-gray-200'}"
				>
					{tab === 'day' ? 'Day' : tab === 'week' ? 'Week' : tab === 'month' ? 'Month' : 'Year'}
				</button>
			{/each}
		</div>
	</header>

	<div class="flex-1 space-y-4 overflow-y-auto px-4 py-4">
		<!-- Summary card -->
		<div class="rounded-2xl border border-gray-100 bg-white p-4">
			<p class="mb-1 text-xs text-gray-400">{PERIOD_LABELS[period]}</p>
			<p class="text-3xl font-bold text-gray-900">{formatPeso(periodTotal)}</p>
			<div class="mt-2 flex items-center gap-3 text-sm">
				<span class="text-gray-500">
					{periodSales.length} sale{periodSales.length !== 1 ? 's' : ''}
				</span>
				{#if periodBorrow > 0}
					<span class="text-gray-300">·</span>
					<span class="font-medium text-amber-700">{formatPeso(periodBorrow)} utang</span>
				{/if}
			</div>
		</div>

		<!-- Top products -->
		{#if topProducts.length > 0}
			<div class="rounded-2xl border border-gray-100 bg-white p-4">
				<p class="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">Top Products</p>
				<ul class="flex flex-col gap-3">
					{#each topProducts as stat, i}
						<li class="flex items-center justify-between gap-3">
							<div class="flex min-w-0 items-center gap-2">
								<span class="w-4 flex-shrink-0 text-right text-xs font-bold text-gray-300">{i + 1}</span>
								<span class="truncate text-sm font-medium text-gray-900">{stat.productName}</span>
								<span class="flex-shrink-0 text-xs text-gray-400">×{stat.qty}</span>
							</div>
							<span class="flex-shrink-0 text-sm font-semibold text-gray-900">{formatPeso(stat.revenue)}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- Sales log -->
		<div>
			<p class="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-gray-500">Sales Log</p>
			{#if periodSales.length === 0}
				<div class="flex flex-col items-center justify-center gap-2 py-16 text-center">
					<p class="text-sm text-gray-400">No sales for this period.</p>
				</div>
			{:else}
				<ul class="overflow-hidden rounded-2xl border border-gray-100 bg-white">
					{#each periodSales as sale (sale.id)}
						<li class="border-b border-gray-100 last:border-b-0">
							<a href={`/stats/${sale.id}`} class="block px-4 py-3 active:bg-gray-50">
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
</div>