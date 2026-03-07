<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { theme } from '$lib/stores/theme.svelte.ts';
	import { dataAdmin } from '$lib/stores/dataAdmin.ts';
	import { toast } from '$lib/stores/toast.svelte.ts';
	import ToastContainer from '$lib/components/ToastContainer.svelte';

	let { children } = $props();

	const tabs = [
		{ href: '/sales',     label: 'Sales',    icon: '🛒' },
		{ href: '/products',  label: 'Products', icon: '📦' },
		{ href: '/borrows',   label: 'Borrows',  icon: '📋' },
		{ href: '/stats',     label: 'Stats',    icon: '📊' },
		{ href: '/inventory', label: 'Stock',    icon: '🗄️' }
	];

	// ── Settings sheet ────────────────────────────────────────────────────────
	let settingsOpen = $state(false);
	let confirmClear = $state<'sales' | 'borrows' | null>(null);
	let clearing = $state(false);

	function openSettings() {
		confirmClear = null;
		settingsOpen = true;
	}

	function closeSettings() {
		settingsOpen = false;
		confirmClear = null;
	}

	async function doClear(type: 'sales' | 'borrows') {
		clearing = true;
		try {
			if (type === 'sales') await dataAdmin.clearSales();
			else await dataAdmin.clearBorrows();
			toast.show(`${type === 'sales' ? 'Sales' : 'Borrow'} data cleared`, 'info');
		} finally {
			clearing = false;
			confirmClear = null;
		}
	}

	// ── Tab swipe ─────────────────────────────────────────────────────────────
	let touchStartX = 0;
	let touchStartY = 0;

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
	}

	function handleTouchEnd(e: TouchEvent) {
		const deltaX = e.changedTouches[0].clientX - touchStartX;
		const deltaY = e.changedTouches[0].clientY - touchStartY;
		if (Math.abs(deltaX) < 60 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;

		const currentIdx = tabs.findIndex((t) => $page.url.pathname.startsWith(t.href));
		if (currentIdx < 0) return;

		if (deltaX < 0 && currentIdx < tabs.length - 1) goto(tabs[currentIdx + 1].href);
		else if (deltaX > 0 && currentIdx > 0) goto(tabs[currentIdx - 1].href);
	}
</script>

<div class="flex h-screen flex-col bg-emerald-50/40">
	<main
		class="flex-1 overflow-hidden"
		ontouchstart={handleTouchStart}
		ontouchend={handleTouchEnd}
	>
		{@render children()}
	</main>

	<nav class="flex border-t border-emerald-100 bg-white/95 backdrop-blur">
		{#each tabs as tab}
			<a
				href={tab.href}
				class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs
					{$page.url.pathname.startsWith(tab.href)
						? 'font-semibold text-green-600 dark:text-green-400'
						: 'text-gray-500'}"
			>
				<span class="text-xl">{tab.icon}</span>
				<span>{tab.label}</span>
			</a>
		{/each}
		<button
			onclick={openSettings}
			class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-gray-500"
		>
			<span class="text-xl">⚙️</span>
			<span>Settings</span>
		</button>
	</nav>

	<ToastContainer />
</div>

{#if settingsOpen}
	<div
		class="fixed inset-0 z-50 flex items-end bg-black/40"
		role="button"
		tabindex="-1"
		onclick={closeSettings}
		onkeydown={(e) => e.key === 'Escape' && closeSettings()}
	>
		<div
			class="w-full rounded-t-3xl bg-white px-5 pb-10 pt-4"
			role="presentation"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200"></div>
			<h2 class="mb-5 text-base font-bold text-gray-900">Settings</h2>

			<!-- Appearance -->
			<div class="mb-6">
				<p class="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">Appearance</p>
				<div class="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
					<div>
						<p class="text-sm font-medium text-gray-900">Dark mode</p>
						<p class="text-xs text-gray-400">Easy on the eyes at night</p>
					</div>
					<button
						role="switch"
						aria-checked={theme.dark}
						onclick={() => theme.toggle()}
						class="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors
							{theme.dark ? 'bg-green-500' : 'bg-gray-300'}"
					>
						<span class="sr-only">Dark mode</span>
						<span class="mt-0.5 inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform
							{theme.dark ? 'translate-x-5' : 'translate-x-0.5'}"></span>
					</button>
				</div>
			</div>

			<!-- Data management -->
			<div>
				<p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Data Management</p>
				<p class="mb-3 text-xs text-gray-400">
					Use to reset data for system evaluation. Products and borrower profiles are not affected.
				</p>

				<!-- Clear sales -->
				{#if confirmClear === 'sales'}
					<div class="mb-3 rounded-2xl border border-red-200 bg-red-50 p-4">
						<p class="mb-3 text-sm font-medium text-red-800">
							Delete all sales and stock adjustments permanently?
						</p>
						<div class="flex gap-2">
							<button
								onclick={() => (confirmClear = null)}
								class="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700"
							>Cancel</button>
							<button
								onclick={() => doClear('sales')}
								disabled={clearing}
								class="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
							>{clearing ? 'Clearing…' : 'Yes, clear'}</button>
						</div>
					</div>
				{:else}
					<button
						onclick={() => (confirmClear = 'sales')}
						class="mb-3 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-left"
					>
						<p class="text-sm font-semibold text-gray-900">Clear all sales data</p>
						<p class="text-xs text-gray-400">Deletes sales log and stock adjustments</p>
					</button>
				{/if}

				<!-- Clear borrows -->
				{#if confirmClear === 'borrows'}
					<div class="rounded-2xl border border-red-200 bg-red-50 p-4">
						<p class="mb-3 text-sm font-medium text-red-800">
							Delete all borrow records and payments permanently?
						</p>
						<div class="flex gap-2">
							<button
								onclick={() => (confirmClear = null)}
								class="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700"
							>Cancel</button>
							<button
								onclick={() => doClear('borrows')}
								disabled={clearing}
								class="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
							>{clearing ? 'Clearing…' : 'Yes, clear'}</button>
						</div>
					</div>
				{:else}
					<button
						onclick={() => (confirmClear = 'borrows')}
						class="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-left"
					>
						<p class="text-sm font-semibold text-gray-900">Clear all borrow data</p>
						<p class="text-xs text-gray-400">Deletes borrow records and payment history</p>
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}