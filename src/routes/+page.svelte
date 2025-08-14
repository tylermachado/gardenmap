<script lang="ts">
	import Map from '$lib/components/Map.svelte';
	import PlantIcon1 from '$lib/icons/noun-plant-6741.svg';
	import Location from '$lib/icons/location.svg';

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
	let searchResultAddress: any = $state(null);

	// New state for per-point polygon lookup results
	let pointLayerData: Record<string, Record<string, any>> = $state({});
	let propertiesConfig: Record<string, string[]> = $state({});
	const layerGeoCache: Record<string, GeoJSON.FeatureCollection> = {};

	// Load properties.json once
	(async () => {
		try {
			const res = await fetch('/properties.json');
			if (res.ok) propertiesConfig = await res.json();
		} catch (e) {
			console.error('Failed loading properties.json', e);
		}
	})();

	function normalizeLayerPath(path: string): string {
		// paths in layers-list.json start with ../ relative to /static; convert to absolute
		if (path.startsWith('../')) return path.replace('..', ''); // ../geodata/file -> /geodata/file
		return path;
	}

	function keyFromPath(path: string): string {
		const file = path.split('/').pop() || '';
		return file.replace(/\.geojson$/i, '');
	}

	async function ensureLayerGeo(layerPath: string): Promise<GeoJSON.FeatureCollection | null> {
		const normalized = normalizeLayerPath(layerPath);
		if (layerGeoCache[normalized]) return layerGeoCache[normalized];
		try {
			const res = await fetch(normalized);
			if (!res.ok) return null;
			const data = (await res.json()) as GeoJSON.FeatureCollection;
			layerGeoCache[normalized] = data;
			return data;
		} catch (e) {
			console.error('Failed fetching layer', layerPath, e);
			return null;
		}
	}

	async function resolvePointData(lat: number, lon: number) {
		try {
			// dynamic import so initial bundle stays small
			const { booleanPointInPolygon, point } = await import('@turf/turf');
			const pt = point([lon, lat]); // GeoJSON uses [lon, lat]
			const results: Record<string, Record<string, any>> = {};

			for (const layer of layers) {
				const fc = await ensureLayerGeo(layer.path);
				if (!fc) continue;
				const layerKey = keyFromPath(layer.path); // e.g. phz, ecoregions
				const allowed = propertiesConfig[layerKey] || [];
				for (const feature of fc.features) {
					if (!feature.geometry) continue;
					const gType = feature.geometry.type;
					if (gType !== 'Polygon' && gType !== 'MultiPolygon') continue;
					if (booleanPointInPolygon(pt, feature as any)) {
						const props = feature.properties || {};
						const filtered: Record<string, any> = {};
						for (const key of allowed) if (key in props) filtered[key] = props[key];
						results[layerKey] = filtered; // store by layer key (phz, ecoregions)
						break; // stop at first containing polygon per layer
					}
				}
			}
			pointLayerData = results;
		} catch (e) {
			console.error('Failed resolving point data', e);
		}
	}
	let showLayersDropdown: boolean = $state(false);

	// any time map updates, pick a random number inclusively between 3 and 12 and set numFlowers
	$effect(() => {
		// dependency reference to trigger effect when mapRef changes
		if (mapRef) {
			// no-op
		}
		numFlowers = Math.floor(Math.random() * 10) + 3;
	});

	// When searchResultAddress changes, console.log the new result
	$effect(() => {
		if (searchResultAddress) {
			console.log('Search result address:', $state.snapshot(searchResultAddress));
		}
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
			`https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&addressdetails=1&q=${encodeURIComponent(searchQuery)}`
		);
		const results = await response.json();
		if (results && results.length > 0) {
			const { lat, lon, address } = results[0];
			searchResultAddress = address; // Save address to state
			const map: L.Map | null = mapRef?.getMap() ?? null;
			const latNum = parseFloat(lat);
			const lonNum = parseFloat(lon);
			if (map) {
				map.setView([latNum, lonNum], 14);
			}
			await resolvePointData(latNum, lonNum);
		} else {
			alert('Location not found.');
		}
	}
</script>

<svelte:head>
	<title>Interactive Map</title>
	<meta name="description" content="Explore geographic data with interactive maps" />
</svelte:head>

<main class="bg-stone-300 min-h-screen flex flex-col">
	<header class="bg-lime-950 p-4">
		<h1 class="font-serif text-3xl font-bold text-stone-100">GardenersMap</h1>
	</header>

	<div class="mt-4 w-full flex flex-row gap-2 px-6 items-center">
		<button
			class="cursor-pointer border border-lime-950 rounded bg-stone-100 px-4 py-2 text-lime-950 hover:bg-lime-950 hover:text-stone-100 whitespace-nowrap flex items-center justify-center sm:w-auto w-12 h-12"
			onclick={findMyLocation}
			aria-label="Find My Location"
		>
			<img src={Location} alt="Find My Location" class="h-s w-s text-blue-500" />

		</button>
		<div class="flex w-full mt-2 sm:mt-0">
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

	<!-- Responsive: map on top, layers below on mobile; side-by-side on desktop -->
	<div class="mt-4 flex flex-col sm:grid sm:grid-cols-5 gap-0 border-t border-stone-700 bg-stone-300 flex-1">
		<!-- Map column: always first, left on desktop -->
		<div class="map-wrapper sm:col-span-3 bg-stone-100 flex w-full order-1 sm:order-1 p-0 sm:p-0 flex-none sm:h-full sm:items-stretch sm:justify-stretch overflow-hidden">
			<div class="w-full h-full aspect-[5/4] sm:aspect-[16/9] max-w-2xl sm:max-w-full">
				<Map bind:this={mapRef} shapefile={selectedLayer?.path} colorArray={hardinessZoneColors} />
			</div>
		</div>
		<!-- Info/controls column: always second, right on desktop -->
		<div class="controls sm:col-span-2 flex flex-col items-start gap-0 bg-stone-300 w-full order-2 sm:order-2">
			<!-- On mobile, show a dropdown for layers -->
			<div class="w-full sm:hidden px-4 py-2">
				<button class="w-full border border-lime-950 rounded bg-stone-100 px-4 py-2 text-lime-950 font-bold flex items-center justify-between" onclick={() => showLayersDropdown = !showLayersDropdown} aria-haspopup="true" aria-expanded={showLayersDropdown}>
					<span>Layers</span>
					<svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
				</button>
				{#if showLayersDropdown}
					<div class="absolute left-0 right-0 mt-2 z-10 bg-stone-100 border border-stone-700 rounded shadow-lg">
						{#each layers as layer}
							<button
								class={`flex w-full items-center justify-start border-b border-stone-700 px-4 py-5 text-l ${layer.name === selectedLayerName ? 'active bg-lime-200 font-bold' : 'cursor-pointer bg-stone-100 hover:bg-lime-100'}`}
								onclick={() => {
									selectedLayerName = layer.name;
									handleLayerChange();
									showLayersDropdown = false;
								}}
							>
								<span class="mr-2">&lsaquo;</span>
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
						class={`flex w-full items-center justify-start border-b border-stone-700 px-4 py-5 text-l ${layer.name === selectedLayerName ? 'active bg-stone-100 font-bold' : 'cursor-pointer bg-stone-300  hover:bg-stone-200'}`}
						onclick={() => {
							selectedLayerName = layer.name;
							handleLayerChange();
						}}
					>
						<span class="mr-2">&lsaquo;</span>
						<span>{layer.name}</span>
					</button>
				{/each}
			</div>
			<div class="w-full items-start p-4 text-left">
				{#if searchResultAddress}
					<h3>
						{[
							searchResultAddress.suburb,
							searchResultAddress.city,
							searchResultAddress.state
						].filter(Boolean).join(', ')}
					</h3>
				{/if}
				<!-- Insert polygon data results -->
				{#if Object.keys(pointLayerData).length > 0}
					<div class="mt-3 space-y-3">
						{#if pointLayerData.phz}
							<div class="rounded border border-stone-500 bg-stone-100 p-2">
								<h4 class="font-semibold text-xs tracking-wide">Plant Hardiness Zone</h4>
								<ul class="mt-1 text-[11px] leading-tight">
									{#if pointLayerData.phz.zone}
										<li><span class="font-mono text-stone-700">zone</span>: {pointLayerData.phz.zone}</li>
									{/if}
									{#if pointLayerData.phz.trange}
										<li><span class="font-mono text-stone-700">trange</span>: {pointLayerData.phz.trange}</li>
									{/if}
								</ul>
							</div>
						{/if}
						{#if pointLayerData.ecoregions}
							<div class="rounded border border-stone-500 bg-stone-100 p-2">
								<h4 class="font-semibold text-xs tracking-wide">Ecoregion (Level 3)</h4>
								{#if pointLayerData.ecoregions.US_L3NAME}
									<p class="mt-1 text-[11px] leading-tight"><span class="font-mono text-stone-700">Layer III</span>: {pointLayerData.ecoregions.US_L3NAME}</p>
									<p class="mt-1 text-[11px] leading-tight"><span class="font-mono text-stone-700">Layer II</span>: {pointLayerData.ecoregions.US_L2NAME}</p>
									<p class="mt-1 text-[11px] leading-tight"><span class="font-mono text-stone-700">Layer I</span>: {pointLayerData.ecoregions.US_L1NAME}</p>
								{/if}
							</div>
						{/if}
 					</div>
				{:else if searchResultAddress}
					<p class="text-[11px] italic text-stone-600 mt-2">No polygon matches at this point.</p>
				{/if}
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

			<div class="w-full items-start p-4 text-left">
				<h3>About This Data</h3>
				<p class="text-left text-sm text-gray-700">{selectedLayer?.description}</p>
			</div>
		</div>
	</div>
</main>

<style>
	main {
		height: 100vh;
		display: flex;
		flex-direction: column;
	}

	/* Remove flex: 1 from .map-wrapper to allow aspect ratio to control height */
</style>
