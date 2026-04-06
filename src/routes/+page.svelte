<script lang="ts">
	import Map from '$lib/components/Map.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import LayerPanel from '$lib/components/LayerPanel.svelte';
	import LocationInfo from '$lib/components/LocationInfo.svelte';
	
	import { GeocodingService } from '$lib/services/geocoding.js';
	import { SpatialAnalysisService } from '$lib/services/spatial-analysis.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	import type * as L from 'leaflet';
	import type { PageData } from './$types';
	import type { LayerOption } from '$lib/types/layer.js';

	let { data }: { data: PageData } = $props();

	const layers = data.availableShapefiles;
	let mapRef: Map | null = $state(null);
	// Change to array of selected layers
	let selectedLayers: LayerOption[] = $state([]);
	let showLayersDropdown: boolean = $state(false);

	let searchQuery: string = $state('');
	let numFlowers: number = $state(0);
	let searchResultAddress: any = $state(null);
	let searchResultDisplayName: string = $state('');

	// New state for per-point polygon lookup results
	let pointLayerData: Record<string, Record<string, any>> = $state({});
	let propertiesConfig: Record<string, string[]> = $state({});

	// Load properties.json once
	(async () => {
		try {
			const res = await fetch('properties.json');
			if (res.ok) propertiesConfig = await res.json();
		} catch (e) {
			console.error('Failed loading properties.json', e);
		}
	})();

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
				// Only load if we haven't already set a location
				if (!searchResultDisplayName) {
					loadLocationFromUrl(lat, lng, zoom);
				}
			}
		}
	});

	async function loadLocationFromUrl(lat: number, lng: number, zoom?: number) {
		try {
			const reverseResult = await GeocodingService.reverseGeocode(lat, lng);
			if (reverseResult && reverseResult.address) {
				searchResultAddress = reverseResult.address;
				updateMarkerDisplayName();
				const map = mapRef?.getMap();
				if (map) {
					map.setView([lat, lng], zoom ?? 10);
				}
				mapRef?.updateSearchMarker(lat, lng, searchResultDisplayName);
				await resolvePointData(lat, lng);
			}
		} catch (error) {
			console.error('Failed to load location from URL:', error);
		}
	}

	// Helper function to check if layer is selected
	function isLayerSelected(layer: LayerOption): boolean {
		return selectedLayers.some(selected => selected.name === layer.name);
	}

	// Toggle layer selection
	function toggleLayer(layer: LayerOption): void {
		if (isLayerSelected(layer)) {
			selectedLayers = selectedLayers.filter(selected => selected.name !== layer.name);
		} else {
			selectedLayers = [...selectedLayers, layer];
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
		// Implement the logic to find and center the map on the user's location
		const map: L.Map | null = mapRef?.getMap() ?? null;
		if (map) {
			map.locate({ 
				setView: true, 
				maxZoom: 16,
				enableHighAccuracy: true
			});
			
			// Add event listener for successful location find
			map.on('locationfound', async (e: L.LocationEvent) => {
				const { lat, lng } = e.latlng;
				
				try {
					// Reverse geocode to get address with ZIP code
					const reverseResult = await GeocodingService.reverseGeocode(lat, lng);
					
					if (reverseResult && reverseResult.address) {
						// Use the address data directly from reverse geocoding
						searchResultAddress = reverseResult.address;
						updateMarkerDisplayName();
						searchResultDisplayName = 'Your Location';
						
						// Set the search query to the found ZIP code if available
						if (reverseResult.address.postcode) {
							searchQuery = reverseResult.address.postcode;
						}
						
						// Update marker on map
						mapRef?.updateSearchMarker(lat, lng, searchResultDisplayName);
						
						// Update URL with location
						updateUrlWithLocation(lat, lng);
						
						// Resolve point data using exact coordinates
						await resolvePointData(lat, lng);
					} else {
						// Fallback: just update the map and resolve point data directly
						searchResultDisplayName = 'Your Location';
						mapRef?.updateSearchMarker(lat, lng, searchResultDisplayName);
						updateUrlWithLocation(lat, lng);
						await resolvePointData(lat, lng);
					}
				} catch (error) {
					console.error('Failed to reverse geocode location:', error);
					// Fallback: just update the map and resolve point data directly
					searchResultDisplayName = 'Your Location';
					mapRef?.updateSearchMarker(lat, lng, searchResultDisplayName);
					updateUrlWithLocation(lat, lng);
					await resolvePointData(lat, lng);
				}
			});
			
			// Add event listener for location error
			map.on('locationerror', (e: L.ErrorEvent) => {
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

		const { lat, lon, address, display_name } = result;
		searchResultAddress = address; // Save address to state
		searchResultDisplayName = display_name || 'Search Result';
		const map: L.Map | null = mapRef?.getMap() ?? null;
		
		if (map) {
			map.setView([lat, lon], 14);
		}
		
		// Update marker on map
		mapRef?.updateSearchMarker(lat, lon, searchResultDisplayName);
		
		// Update URL with location
		updateUrlWithLocation(lat, lon);
		
		await resolvePointData(lat, lon);
	}

	function updateMarkerDisplayName(): void {
		if (searchResultAddress) {
			searchResultDisplayName = [
				searchResultAddress?.suburb,
				searchResultAddress?.town,
				searchResultAddress?.city,
				searchResultAddress?.state
			]
				.filter(Boolean)
				.join(', ');
		} else {
			searchResultDisplayName = '';
		}
	}

	async function handleMapClick(lat: number, lng: number) {
		// Try to reverse geocode for address information
		try {
			const reverseResult = await GeocodingService.reverseGeocode(lat, lng);
			if (reverseResult && reverseResult.address) {
				searchResultAddress = reverseResult.address;
				updateMarkerDisplayName();
				// Update marker on map
				mapRef?.updateSearchMarker(lat, lng, searchResultDisplayName);
				// Update URL with location
				updateUrlWithLocation(lat, lng);
			} else {
				searchResultAddress = null;
				searchResultDisplayName = '';
				mapRef?.updateSearchMarker(lat, lng, '');
			}
		} catch (error) {
			console.error('Failed to reverse geocode clicked location:', error);
			searchResultAddress = null;
			searchResultDisplayName = '';
			mapRef?.updateSearchMarker(lat, lng, '');
		}
		
		// Clear search query since user clicked instead of searched
		searchQuery = '';
		
		// Resolve spatial analysis data for this point
		if (searchResultDisplayName) {
			await resolvePointData(lat, lng);
		}
	}
</script>

<svelte:head>
	<title>Interactive Map</title>
	<meta name="description" content="Explore geographic data with interactive maps" />
</svelte:head>

<SearchBar 
	bind:searchQuery 
	onSearch={searchLocation}
	onFindLocation={findMyLocation}
/>

<!-- Responsive: map on top, layers below on mobile; side-by-side on desktop -->
<div class="mt-4 flex flex-col sm:grid sm:grid-cols-4 gap-0 border-t border-stone-700 bg-stone-300 flex-1">
	<!-- Map column: always first, left on desktop -->
	<div class="map-wrapper sm:col-span-2 bg-stone-100 flex w-full order-1 sm:order-1 p-0 sm:p-0 flex-none sm:h-full sm:items-stretch sm:justify-stretch overflow-hidden relative">
		<div class="w-full h-full aspect-[5/4] sm:aspect-[16/9] max-w-2xl sm:max-w-full">
			<Map bind:this={mapRef} shapefiles={selectedLayers.map(layer => layer.path)} colorArray={hardinessZoneColors} onMapClick={handleMapClick} />
		</div>
		
		<!-- Floating layers dropdown for desktop -->
		<div class="hidden sm:block absolute top-4 right-4" style="z-index: 1000;">
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
							class={`flex w-full items-center justify-start border-b border-stone-700 px-4 py-5 text-l ${isLayerSelected(layer) ? 'active bg-lime-200 font-bold' : 'cursor-pointer bg-stone-100 hover:bg-lime-100'}`}
							onclick={() => {
								toggleLayer(layer);
							}}
						>
							<span class="mr-2">{isLayerSelected(layer) ? '✓' : '○'}</span>
							<span>{layer.name}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
	<!-- Info/controls column: always second, right on desktop -->
	<div class="controls sm:col-span-2 flex flex-col items-start gap-0 bg-stone-300 w-full order-2 sm:order-2">
		<LayerPanel 
			layers={layers}
			selectedLayers={selectedLayers}
			onToggleLayer={toggleLayer}
		/>
		
		<LocationInfo 
			searchResultAddress={searchResultAddress}
			pointLayerData={pointLayerData}
			numFlowers={numFlowers}
		/>
	</div>
</div>
