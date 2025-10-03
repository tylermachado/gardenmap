<script lang="ts">
	import type { LayerOption } from '../types/layer.js';

	interface LayerPanelProps {
		layers: LayerOption[];
		selectedLayers: LayerOption[];
		onToggleLayer: (layer: LayerOption) => void;
	}

	let { layers, selectedLayers, onToggleLayer }: LayerPanelProps = $props();
	let showLayersDropdown: boolean = $state(false);

	// Helper function to check if layer is selected
	function isLayerSelected(layer: LayerOption): boolean {
		return selectedLayers.some(selected => selected.name === layer.name);
	}
</script>

<!-- On mobile, show a dropdown for layers -->
<div class="w-full sm:hidden px-4 py-2">
	<button 
		class="w-full border border-lime-950 rounded bg-stone-100 px-4 py-2 text-lime-950 font-bold flex items-center justify-between" 
		onclick={() => showLayersDropdown = !showLayersDropdown} 
		aria-haspopup="true" 
		aria-expanded={showLayersDropdown}
	>
		<span>Layers ({selectedLayers.length})</span>
		<svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>
	{#if showLayersDropdown}
		<div class="absolute left-0 right-0 mt-2 z-10 bg-stone-100 border border-stone-700 rounded shadow-lg">
			{#each layers as layer}
				<button
					class={`flex w-full items-center justify-start border-b border-stone-700 px-4 py-5 text-l ${isLayerSelected(layer) ? 'active bg-lime-200 font-bold' : 'cursor-pointer bg-stone-100 hover:bg-lime-100'}`}
					onclick={() => onToggleLayer(layer)}
				>
					<span class="mr-2">{isLayerSelected(layer) ? '✓' : '○'}</span>
					<span>{layer.name}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<!-- On desktop, show the layer buttons as before -->
<div class="hidden sm:block w-full">
	{#each layers as layer}
		<button
			class={`flex w-full items-center justify-start border-b border-stone-700 px-4 py-5 text-l ${isLayerSelected(layer) ? 'active bg-stone-100 font-bold' : 'cursor-pointer bg-stone-300 hover:bg-stone-200'}`}
			onclick={() => onToggleLayer(layer)}
		>
			<span class="mr-2">{isLayerSelected(layer) ? '✓' : '○'}</span>
			<span>{layer.name}</span>
		</button>
	{/each}
</div>

<!-- Layer descriptions -->
<div class="w-full items-start p-4 text-left">
	<h3>About This Data</h3>
	{#if selectedLayers.length > 0}
		{#each selectedLayers as layer}
			<div class="mb-2">
				<p class="font-semibold text-sm">{layer.name}</p>
				<p class="text-left text-sm text-gray-700">{layer.description}</p>
			</div>
		{/each}
	{:else}
		<p class="text-left text-sm text-gray-700">Select one or more layers to view their data.</p>
	{/if}
</div>
