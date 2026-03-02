<script lang="ts">
	import { toast } from '$lib/stores/toast.svelte.ts';
</script>

<!-- Fixed overlay — sits above everything, below modals -->
<div class="pointer-events-none fixed bottom-24 left-0 right-0 z-40 flex flex-col items-center gap-2 px-4">
	{#each toast.toasts as t (t.id)}
		<div
			class="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg
				max-w-sm w-full
				{t.type === 'success' ? 'bg-gray-900 text-white' :
				 t.type === 'error'   ? 'bg-red-600 text-white'  :
				                        'bg-gray-700 text-white'}"
		>
			{#if t.type === 'success'}
				<svg class="h-4 w-4 flex-shrink-0 text-green-400" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/>
				</svg>
			{:else if t.type === 'error'}
				<svg class="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
				</svg>
			{/if}
			<span class="flex-1">{t.message}</span>
		</div>
	{/each}
</div>
