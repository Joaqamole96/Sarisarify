<script lang="ts">
	import { getProductIconComponent } from '$lib/productIcons';

	interface Props {
		iconKey?: string;
		iconEmoji?: string;
		color?: string;       // hex or CSS color — passed as currentColor to lucide icon
		class?: string;
	}

	let { iconKey, iconEmoji, color, class: className }: Props = $props();

	let Icon = $derived(getProductIconComponent(iconKey));
</script>

{#if Icon}
	<Icon class={className} style={color ? `color: ${color}` : undefined} aria-hidden="true" />
{:else if iconEmoji}
	<span class={className} aria-hidden="true">{iconEmoji}</span>
{:else}
	<span class={className} aria-hidden="true">📦</span>
{/if}