<script lang="ts">
	import { page } from '$app/stores';
	import ToastContainer from '$lib/components/ToastContainer.svelte';

	let { children } = $props();

	const tabs = [
		{ href: '/sales',     label: 'Sales',     icon: '🛒' },
		{ href: '/products',  label: 'Products',  icon: '📦' },
		{ href: '/borrows',   label: 'Borrows',   icon: '📋' },
		{ href: '/stats',     label: 'Stats',     icon: '📊' },
		{ href: '/inventory', label: 'Stock',     icon: '🗄️' }
	];
</script>

<div class="flex h-screen flex-col bg-emerald-50/40">
	<!-- Main content area -->
	<main class="flex-1 overflow-hidden">
		{@render children()}
	</main>

	<!-- Bottom navigation -->
	<nav class="flex border-t border-emerald-100 bg-white/95 backdrop-blur">
		{#each tabs as tab}
			<a
				href={tab.href}
				class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs
					{$page.url.pathname.startsWith(tab.href)
						? 'text-green-600 font-semibold'
						: 'text-gray-500'}"
			>
				<span class="text-xl">{tab.icon}</span>
				<span>{tab.label}</span>
			</a>
		{/each}
	</nav>

	<!-- Toast notifications — above page content, below modals (z-40) -->
	<ToastContainer />
</div>