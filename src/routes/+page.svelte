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

<main>
	<h1>Geographic Data Explorer</h1>

	<div class="controls">
		<label for="layer-select">Select Layer:</label>
		<select id="layer-select" bind:value={selectedLayerName} onchange={handleLayerChange}>
			{#each layers as layer}
					<option value={layer.name}>{layer.name}</option>
			{/each}
	</select>
	</div>

	<div class="map-wrapper">
		<Map
			bind:this={mapRef}
  		geojsonFile={selectedLayer?.path}
			colorArray={hardinessZoneColors}
			center={[39.8283, -98.5795]}
			zoom={4}
		/>
	</div>
</main>

<style>
	main {
		padding: 1rem;
		height: 100vh;
		display: flex;
		flex-direction: column;
	}

	h1 {
		margin: 0 0 1rem 0;
		color: #333;
	}

	.controls {
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.controls label {
		font-weight: bold;
	}

	.controls select {
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	.map-wrapper {
		flex: 1;
		border: 1px solid #ddd;
		border-radius: 8px;
		overflow: hidden;
	}
</style>
