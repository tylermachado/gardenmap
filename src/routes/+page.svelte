<script lang="ts">
	import Map from '$lib/components/Map.svelte';
	import PlantIcon1 from '$lib/icons/noun-plant-6741.svg';

	import type * as L from 'leaflet';
	import type { PageData } from './$types';
	import type { LayerOption } from './+page';

	let { data }: { data: PageData } = $props();

	const layers = data.availableShapefiles;
	let mapRef: Map | null = $state(null);
	let selectedLayer: LayerOption | null = $state(layers.length > 0 ? layers[0] : null);
	let selectedLayerName: string = $state(layers[0]?.name || '');
	let searchQuery: string = $state('');
	let numFlowers: number = $state(0);

	// any time map updates, pick a random number inclusively between 3 and 12 and set numFlowers
	$effect(() => {
		const dependencies = [mapRef];
		numFlowers = Math.floor(Math.random() * 10) + 3;
	});

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
		selectedLayer = layers.find((layer) => layer.name === selectedLayerName) || null;

		// You can call methods on the map instance here
		const map: L.Map | null = mapRef?.getMap() ?? null;
		if (map) {
			// Add layer filtering logic here
			console.log('Map instance available for layer operations');
		}
	}

	function findMyLocation() {
		// Implement the logic to find and center the map on the user's location
		const map: L.Map | null = mapRef?.getMap() ?? null;
		if (map) {
			map.locate({ setView: true, maxZoom: 16 });
		}
	}

	async function searchLocation() {
		if (!searchQuery) return;
		const response = await fetch(
			`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
		);
		const results = await response.json();
		if (results && results.length > 0) {
			const { lat, lon } = results[0];
			const map: L.Map | null = mapRef?.getMap() ?? null;
			if (map) {
				map.setView([parseFloat(lat), parseFloat(lon)], 14);
			}
		} else {
			alert('Location not found.');
		}
	}
</script>

<svelte:head>
	<title>Interactive Map</title>
	<meta name="description" content="Explore geographic data with interactive maps" />
</svelte:head>

<main class="bg-stone-300">
	<header class="bg-lime-950 p-4">
		<h1 class="font-serif text-3xl font-bold text-stone-100">GardenersMap</h1>
	</header>

	<div class="mt-4 w-full flex flex-row gap-2 px-6">
		<button
			class="cursor-pointer border border-lime-950 rounded bg-stone-100 px-4 py-2  text-lime-950 hover:bg-lime-950 hover:text-stone-100 whitespace-nowrap"
			onclick={findMyLocation}
		>
			Find My Location
		</button>
		<div class="flex w-full">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search for a location..."
				class="flex-1 rounded-l border border-lime-950 border-r-0 px-3 py-2 focus:outline-none"
				onkeydown={(e) => {
					if (e.key === 'Enter') searchLocation();
				}}
			/>
			<button
				class="rounded-r border border-lime-950 border-l-0 bg-stone-100 px-4 py-2 text-lime-950 hover:bg-lime-950 hover:text-stone-100"
				onclick={searchLocation}
			>
				Search
			</button>
		</div>
	</div>

	<div class="mt-4 grid grid-cols-5 gap-0 border-t border-stone-700 bg-stone-300">
		<div class="controls col-span-2 flex flex-col items-start gap-0 bg-stone-300">
			{#each layers as layer}
				<button
					class={`flex w-full items-center justify-end border-b border-stone-700 px-4 py-5 text-l
						${
							layer.name === selectedLayerName
								? 'active bg-stone-100 font-bold'
								: 'cursor-pointer bg-stone-300  hover:bg-stone-200'
						}`}
					onclick={() => {
						selectedLayerName = layer.name;
						handleLayerChange();
					}}
				>
					<span>{layer.name}</span>
					<span class="ml-2">&rsaquo;</span>
				</button>
			{/each}
			<div class="w-full items-start p-4 text-left">
				<h3>About This Data</h3>
				<p class="text-left text-sm text-gray-700">{selectedLayer?.description}</p>
			</div>

			<div class="w-full items-start p-4 text-left">
				<h3 class="w-full items-start text-left">Plants That Thrive Here</h3>
				<div class="grid w-full grid-cols-4 gap-2 p-4">
					{#each Array(Math.max(3, Math.min(12, numFlowers))) as _, i}
						<div class="flex aspect-square items-center justify-center">
							<span class="text-2xl">
								<img src={PlantIcon1} alt="Plant" class="h-xl w-xl text-blue-500" />
							</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div class="map-wrapper col-span-3 bg-stone-100 p-6">
			<Map bind:this={mapRef} geojsonFile={selectedLayer?.path} colorArray={hardinessZoneColors} />
		</div>
	</div>
</main>

<style>
	main {
		height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.map-wrapper {
		flex: 1;
	}
</style>
