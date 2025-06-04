<script lang="ts">
	import Map from '$lib/components/Map.svelte';
	import type * as L from 'leaflet';
	import type { PageData } from './$types';
	import type { LayerOption } from './+page';

	let { data }: { data: PageData } = $props();

	let mapRef: Map | null = $state(null);
	const layers = data.availableShapefiles;
	let selectedLayer: LayerOption | null = $state(layers.length > 0 ? layers[0] : null);
	let selectedLayerName: string = $state(layers[0]?.name || '');


	const hardinessZoneColors = [
		'#1a0d40',
		'#2d1b69',
		'#4169e1',
		'#1e90ff',
		'#00bfff',
		'#40e0d0',
		'#32cd32',
		'#9acd32',
		'#ffd700',
		'#ffa500',
		'#ff6347',
		'#dc143c',
		'#8b0000'
	];

	function handleLayerChange(): void {
		selectedLayer = layers.find(layer => layer.name === selectedLayerName) || null;

		// You can call methods on the map instance here
		const map: L.Map | null = mapRef?.getMap() ?? null;
		if (map) {
			// Add layer filtering logic here
			console.log('Map instance available for layer operations');
		}
	}
</script>

<svelte:head>
	<title>Interactive Map</title>
	<meta name="description" content="Explore geographic data with interactive maps" />
</svelte:head>

<main class="bg-stone-300">
	<header class ="bg-lime-950  p-4">
		<h1 class="text-3xl font-bold text-stone-100 font-serif">GardenersMap</h1>
	</header>

	<div class="grid grid-cols-4 gap-0 bg-stone-300">

		<div class="controls col-span-1 flex flex-col gap-0 bg-stone-300 items-start">
			{#each layers as layer}
				<button
					class={`w-full px-4 py-10 flex items-center justify-between text-xl
						${layer.name === selectedLayerName 
							? 'active font-bold bg-stone-100' 
							: 'bg-stone-300 hover:bg-stone-200  cursor-pointer'}`}
					onclick={() => {
						selectedLayerName = layer.name;
						handleLayerChange();
					}}
					>
						<span>{layer.name}</span>
						{#if layer.name === selectedLayerName}
							<span class="ml-2">&rsaquo;</span>
						{/if}
					</button>
			{/each}
			<div class="p-4 w-full text-left items-start">
				<p class="text-sm text-gray-700 text-left"><span class="font-bold">About this layer:</span> {selectedLayer?.description}</p>	
			</div>
		</div>

		<div class="map-wrapper col-span-3 p-6 bg-stone-100">
			<Map
				bind:this={mapRef}
				geojsonFile={selectedLayer?.path}
				colorArray={hardinessZoneColors}
			/>
		</div>
	</div>
</main>

<style>
	main {
		height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.controls {
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.map-wrapper {
		flex: 1;
	}
</style>
