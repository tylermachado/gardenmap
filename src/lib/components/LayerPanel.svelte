<script lang="ts">
	import type { LayerOption } from '../types/layer.js';
	import { isLayerSelected } from '../types/layer.js';

	interface LayerPanelProps {
		layers: LayerOption[];
		selectedLayers: LayerOption[];
		onToggleLayer: (layer: LayerOption) => void;
	}

	let { layers, selectedLayers, onToggleLayer }: LayerPanelProps = $props();
</script>

<!-- Layer descriptions -->
<div class="w-full items-start p-4 text-left">
	
	{#if selectedLayers.length > 0}
	<h3>About This Data</h3>
		{#each selectedLayers as layer}
			<div class="mb-2">
				<p class="font-semibold text-sm">{layer.name}</p>
				<p class="text-left text-sm text-gray-700">{layer.description}</p>
			</div>
		{/each}
	{:else}
		<p class="text-left text-sm text-gray-700">Select a layer to view its data.</p>
	{/if}
</div>
