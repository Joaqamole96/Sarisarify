<script lang="ts">
	import { getProductIconComponent } from '$lib/productIcons';

	interface Props {
		iconKey?: string;
		iconEmoji?: string;
		class?: string;
	}

	let { iconKey, iconEmoji, class: className }: Props = $props();

	let Icon = $derived(getProductIconComponent(iconKey));
</script>

{#if Icon}
	<Icon class={className} aria-hidden="true" />
{:else if iconEmoji}
	<span class={className} aria-hidden="true">{iconEmoji}</span>
{:else}
	<span class={className} aria-hidden="true">📦</span>
{/if}

