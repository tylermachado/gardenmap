<script lang="ts">
	import Map from '$lib/components/Map.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import LayerPanel from '$lib/components/LayerPanel.svelte';
	import LocationInfo from '$lib/components/LocationInfo.svelte';
	import CandidatePlants from '$lib/components/CandidatePlants.svelte';
	
	import { GeocodingService } from '$lib/services/geocoding.js';
	import { SpatialAnalysisService } from '$lib/services/spatial-analysis.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	import type * as L from 'leaflet';
	import type { PageData } from './$types';
	import type { LayerOption, NominatimAddress } from '$lib/types/layer.js';
	import { isLayerSelected } from '$lib/types/layer.js';

	let { data }: { data: PageData } = $props();

	// Evaluated once at init — shared links with coords skip the splash
	const hasInitialUrlParams =
		!!$page.url.searchParams.get('lat') && !!$page.url.searchParams.get('lng');

	const layers = data.availableShapefiles;
	let mapRef: Map | null = $state(null);
	// Change to array of selected layers
	let selectedLayers: LayerOption[] = $state([]);
	let showLayersDropdown: boolean = $state(false);

	let searchQuery: string = $state('');
	let numFlowers: number = $state(0);
	let searchResultAddress = $state<NominatimAddress | null>(null);
	let currentCoords: { lat: number; lng: number } | null = $state(null);
	const showSplash = $derived(currentCoords === null && !hasInitialUrlParams);
	const searchResultDisplayName = $derived(
		[
			searchResultAddress?.suburb,
			searchResultAddress?.village,
			searchResultAddress?.town,
			searchResultAddress?.city,
			searchResultAddress?.state
		]
			.filter(Boolean)
			.join(', ')
	);

	// New state for per-point polygon lookup results
	let pointLayerData: Record<string, Record<string, any>> = $state({});
	const propertiesConfig = data.propertiesConfig;

	async function resolvePointData(lat: number, lon: number) {
		try {
			const results = await SpatialAnalysisService.analyzePoint(lat, lon, layers, propertiesConfig);
			pointLayerData = results;
		} catch (e) {
			console.error('Failed resolving point data', e);
		}
	}

	function updateUrlWithLocation(lat: number, lng: number, zoom?: number): void {
		const map = mapRef?.getMap();
		const zoomLevel = zoom ?? map?.getZoom() ?? 10;
		const params = new URLSearchParams();
		params.set('lat', lat.toFixed(6));
		params.set('lng', lng.toFixed(6));
		params.set('zoom', zoomLevel.toString());
		goto(`?${params.toString()}`, { replaceState: true });
	}

	// Load location from URL params on mount
	$effect.pre(() => {
		const searchParams = $page.url.searchParams;
		const urlLat = searchParams.get('lat');
		const urlLng = searchParams.get('lng');
		const urlZoom = searchParams.get('zoom');
		
		if (urlLat && urlLng) {
			const lat = parseFloat(urlLat);
			const lng = parseFloat(urlLng);
			const zoom = urlZoom ? parseInt(urlZoom) : undefined;
			if (!isNaN(lat) && !isNaN(lng)) {
				// untrack currentCoords so it doesn't retrigger this effect when reset;
				// only URL changes should drive a reload from params
				untrack(() => {
					if (!currentCoords) {
						loadLocationFromUrl(lat, lng, zoom);
					}
				});
			}
		}
	});

	async function loadLocationFromUrl(lat: number, lng: number, zoom?: number) {
		try {
			await setLocation(lat, lng);
			const map = mapRef?.getMap();
			if (map) {
				map.setView([lat, lng], zoom ?? 10);
			}
		} catch (error) {
			console.error('Failed to load location from URL:', error);
		}
	}

	// Toggle layer selection (single layer only)
	function toggleLayer(layer: LayerOption): void {
		if (isLayerSelected(layer, selectedLayers)) {
			// If clicking the same layer, deselect it
			selectedLayers = [];
		} else {
			// If clicking a different layer, select only that layer
			selectedLayers = [layer];
		}
		
		// Close dropdown after selection
		showLayersDropdown = false;

		// You can call methods on the map instance here
		const map: L.Map | null = mapRef?.getMap() ?? null;
		if (map) {
			// Add layer filtering logic here
			console.log('Map instance available for layer operations', selectedLayers);
		}
	}

	// any time map updates, pick a random number inclusively between 3 and 12 and set numFlowers
	$effect(() => {
		// dependency reference to trigger effect when mapRef changes
		if (mapRef) {
			// no-op
		}
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

	async function findMyLocation() {
		const map: L.Map | null = mapRef?.getMap() ?? null;
		if (map) {
			map.locate({
				setView: true,
				maxZoom: 16,
				enableHighAccuracy: true
			});

			map.once('locationfound', async (e: L.LocationEvent) => {
				const { lat, lng } = e.latlng;
				await setLocation(lat, lng);
				if (searchResultAddress?.postcode) {
					searchQuery = searchResultAddress.postcode;
				}
			});

			map.once('locationerror', (e: L.ErrorEvent) => {
				alert('Unable to find your location: ' + e.message);
			});
		}
	}

	async function searchLocation() {
		const result = await GeocodingService.searchLocation(searchQuery);
		if (!result) {
			alert('Location not found.');
			return;
		}

		const { lat, lon, address } = result;
		await setLocation(lat, lon, address);
		const map: L.Map | null = mapRef?.getMap() ?? null;
		if (map) {
			map.setView([lat, lon], 14);
		}
	}

	async function setLocation(
		lat: number,
		lng: number,
		address?: NominatimAddress | null
	): Promise<void> {
		const resolved =
			address !== undefined
				? address
				: (await GeocodingService.reverseGeocode(lat, lng))?.address ?? null;
		searchResultAddress = resolved;
		currentCoords = { lat, lng };
		mapRef?.addSearchMarker(lat, lng, searchResultDisplayName || undefined);
		updateUrlWithLocation(lat, lng);
		await resolvePointData(lat, lng);
	}

	async function handleMapClick(lat: number, lng: number) {
		const result = await GeocodingService.reverseGeocode(lat, lng);
		if (!result) return; // not a US address, ignore the click
		searchQuery = '';
		await setLocation(lat, lng, result.address);
	}

	function handleLocationReset() {
		searchResultAddress = null;
		currentCoords = null;
		pointLayerData = {};
		searchQuery = '';
		goto('?', { replaceState: true });
	}
</script>

<svelte:head>
	<title>Interactive Map</title>
	<meta name="description" content="Explore geographic data with interactive maps" />
</svelte:head>

{#if showSplash}
	<div
		class="flex-1 flex flex-col items-center justify-center bg-lime-950"
		out:fly={{ y: -100, duration: 500, easing: cubicOut }}
	>
		<div class="w-full max-w-2xl px-8 flex flex-col items-center gap-8">
			<h2 class="text-stone-100 text-center leading-tight" style="font-family: var(--font-serif); font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 700;">
				Enter your zip code and find native plants for your area.
			</h2>
			<div class="w-full">
				<SearchBar
					variant="splash"
					bind:searchQuery
					onSearch={searchLocation}
					onFindLocation={findMyLocation}
				/>
			</div>
		</div>
	</div>
{:else}
	<div
		class="flex flex-col flex-1 overflow-hidden"
		in:fly={{ y: 80, duration: 500, delay: 100, easing: cubicOut }}
	>
		<SearchBar
			bind:searchQuery
			onSearch={searchLocation}
			onFindLocation={findMyLocation}
		/>

		<!-- Two-pane layout: persistent sidebar (map + climate) + scrollable plant grid -->
		<div class="flex flex-col sm:flex-row flex-1 overflow-hidden border-t border-stone-700">

			<!-- Left sidebar: map + location info + layer panel -->
			<div class="sm:w-1/3 lg:w-1/4 flex flex-col overflow-y-auto bg-stone-200 sm:border-r border-stone-700 flex-shrink-0">

				<!-- Map -->
				<div class="relative w-full overflow-hidden bg-stone-100">
					<div class="w-full aspect-[16/9]">
						<Map bind:this={mapRef} shapefiles={selectedLayers.map(layer => layer.path)} colorArray={hardinessZoneColors} onMapClick={handleMapClick} onLocationReset={handleLocationReset} />
					</div>

					<!-- Floating layers dropdown -->
					<div class="absolute top-4 right-4" style="z-index: 1000;">
						<button
							class="border border-lime-950 rounded bg-stone-100 px-4 py-2 text-lime-950 font-bold flex items-center justify-between shadow-md hover:bg-stone-50"
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
							<div class="absolute top-full right-0 mt-2 bg-stone-100 border border-stone-700 rounded shadow-lg w-48" style="z-index: 1001;">
								{#each layers as layer}
									<button
										class={`flex w-full items-center justify-start border-b border-stone-700 px-4 py-5 text-l ${isLayerSelected(layer, selectedLayers) ? 'active bg-lime-200 font-bold' : 'cursor-pointer bg-stone-100 hover:bg-lime-100'}`}
										onclick={() => toggleLayer(layer)}
									>
										<span class="mr-2">{isLayerSelected(layer, selectedLayers) ? '✓' : '○'}</span>
										<span>{layer.name}</span>
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- Location info + layer descriptions -->
				<LocationInfo
					searchResultAddress={searchResultAddress}
					pointLayerData={pointLayerData}
				/>
				<LayerPanel
					layers={layers}
					selectedLayers={selectedLayers}
					onToggleLayer={toggleLayer}
				/>
			</div>

			<!-- Right pane: plant grid (independently scrollable) -->
			<div class="flex-1 overflow-y-auto bg-stone-300">
				<CandidatePlants zipcode={searchResultAddress?.postcode} />
			</div>

		</div>
	</div>
{/if}
