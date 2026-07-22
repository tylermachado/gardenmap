<script lang="ts">
	import Map from '$lib/components/Map.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import LocationInfo from '$lib/components/LocationInfo.svelte';
	import CandidatePlants from '$lib/components/CandidatePlants.svelte';
	import PlantSearchResults from '$lib/components/PlantSearchResults.svelte';
	import PlantFilters from '$lib/components/PlantFilters.svelte';
	import type { PlantSearchResult } from '$lib/types/plant.js';
	import { searchPlants } from '$lib/api/plants.js';
	import { createPlantFilters, clearPlantFilters, countActiveFilters } from '$lib/plant-filters.js';

	import { GeocodingService } from '$lib/services/geocoding.js';
	import { SpatialAnalysisService } from '$lib/services/spatial-analysis.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { untrack } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	import type * as L from 'leaflet';
	import type { PageData } from './$types';
	import type { LayerOption, NominatimAddress } from '$lib/types/layer.js';
	import { isLayerSelected } from '$lib/types/layer.js';

	let { data }: { data: PageData } = $props();

	const layers = data.availableShapefiles;
	let mapRef: Map | null = $state(null);
	// Change to array of selected layers
	let selectedLayers: LayerOption[] = $state(layers.filter(l => l.path === 'geodata/phz.json'));	let showLayersDropdown: boolean = $state(false);
	// Independent add-on layer, not part of the mutually-exclusive polygon layer selection
	let showNurseries: boolean = $state(false);

	let searchQuery: string = $state('');
	let numFlowers: number = $state(0);

	// Plant-name search (the "is this plant right for here?" flow)
	let searchMode: 'location' | 'plant' = $state('location');
	let plantQuery: string = $state('');
	let plantSearchActive: boolean = $state(false);
	let plantSearchTerm: string = $state('');
	let plantSearchResults: PlantSearchResult[] = $state([]);
	let plantSearchLoading: boolean = $state(false);
	let plantSearchError: string | null = $state(null);

	async function searchPlantByName(term: string) {
		plantSearchActive = true;
		plantSearchTerm = term;
		plantSearchLoading = true;
		plantSearchError = null;
		try {
			plantSearchResults = await searchPlants(term, {
				zipcode: searchResultAddress?.postcode
			});
		} catch (err) {
			plantSearchError = err instanceof Error ? err.message : 'Unknown error';
			plantSearchResults = [];
		} finally {
			plantSearchLoading = false;
		}
	}

	// A location added (or changed) after a plant search already ran needs the
	// suitability verdicts re-fetched with the now-known zipcode.
	let verdictZip: string | undefined;
	$effect(() => {
		const zip = searchResultAddress?.postcode;
		if (plantSearchActive && plantSearchTerm && zip !== verdictZip) {
			verdictZip = zip;
			searchPlantByName(plantSearchTerm);
		}
	});

	function clearPlantSearch() {
		plantSearchActive = false;
		plantSearchTerm = '';
		plantSearchResults = [];
		plantSearchError = null;
		plantQuery = '';
		verdictZip = undefined;
		searchMode = 'location';
	}

	// Shared plant filters: pre-selected on the splash, then carried into the results.
	let plantFilters = $state(createPlantFilters());
	let showSplashFilters: boolean = $state(false);
	const splashFilterCount = $derived(countActiveFilters(plantFilters));
	let searchResultAddress = $state<NominatimAddress | null>(null);
	let currentCoords: { lat: number; lng: number } | null = $state(null);
	// URL with lat/lng (e.g. a shared link) skips the splash even before
	// currentCoords resolves asynchronously via setLocation.
	const urlHasCoords = $derived(
		!!$page.url.searchParams.get('lat') && !!$page.url.searchParams.get('lng')
	);
	const showSplash = $derived(currentCoords === null && !urlHasCoords && !plantSearchActive);

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
		const zoomLevel = zoom ?? map?.getZoom() ?? 6;
		// Preserve unrelated params (e.g. a plant modal's ?plant=<id>) instead of
		// overwriting the whole query string.
		const params = new URLSearchParams($page.url.searchParams);
		params.set('lat', lat.toFixed(6));
		params.set('lng', lng.toFixed(6));
		params.set('zoom', zoomLevel.toString());
		goto(`?${params.toString()}`, { replaceState: true });
	}

	// Load location from URL params on mount, and reset back to the splash
	// when navigating to a URL with no location params (e.g. clicking the logo).
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
		} else {
			untrack(() => {
				if (currentCoords) {
					resetLocationState();
				}
			});
		}
	});

	async function loadLocationFromUrl(lat: number, lng: number, zoom?: number) {
		try {
			await setLocation(lat, lng);
			const map = mapRef?.getMap();
			if (map) {
				map.setView([lat, lng], zoom ?? 6);
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

	// Nurseries are an optional add-on layer that can be shown alongside a polygon layer,
	// so this toggles independently rather than replacing selectedLayers.
	function toggleNurseries(): void {
		showNurseries = !showNurseries;
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
		} else {
			// Use browser geolocation API when map is not available (e.g., on splash screen)
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(
					async (position) => {
						const { latitude, longitude } = position.coords;
						await setLocation(latitude, longitude);
						if (searchResultAddress?.postcode) {
							searchQuery = searchResultAddress.postcode;
						}
					},
					(error) => {
						alert('Unable to find your location: ' + error.message);
					},
					{ enableHighAccuracy: true }
				);
			} else {
				alert('Geolocation is not supported by your browser.');
			}
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
			map.setView([lat, lon], 6);
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
		mapRef?.addSearchMarker(lat, lng);
		updateUrlWithLocation(lat, lng);
		await resolvePointData(lat, lng);
	}

	async function handleMapClick(lat: number, lng: number) {
		const result = await GeocodingService.reverseGeocode(lat, lng);
		if (!result) return; // not a US address, ignore the click
		searchQuery = '';
		await setLocation(lat, lng, result.address);
	}

	function handleZoomChange(zoomLevel: number) {
		const map = mapRef?.getMap();
		if (!map) return;
		const center = currentCoords ?? map.getCenter();
		updateUrlWithLocation(center.lat, center.lng, zoomLevel);
	}

	function resetLocationState() {
		searchResultAddress = null;
		currentCoords = null;
		pointLayerData = {};
		searchQuery = '';
		clearPlantFilters(plantFilters);
		showSplashFilters = false;
	}

	function handleLocationReset() {
		resetLocationState();
		goto('?', { replaceState: true });
	}

	// Mobile-only "scroll down" hint so users discover the plant list below the map.
	let resultsScrollEl: HTMLElement | null = $state(null);
	let plantListEl: HTMLElement | null = $state(null);
	let scrollHintVisible: boolean = $state(true);

	function handleResultsScroll() {
		if (resultsScrollEl) {
			scrollHintVisible = resultsScrollEl.scrollTop < 40;
		}
	}

	function scrollToPlants() {
		plantListEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	// Re-show the hint whenever a new location is loaded.
	$effect(() => {
		if (currentCoords) {
			scrollHintVisible = true;
		}
	});
</script>

<svelte:head>
	<title>My Native Plant List</title>
	<meta name="description" content="Explore geographic data with interactive maps" />
</svelte:head>

{#if showSplash}
	<div
		class="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
		out:fly={{ y: -100, duration: 500, easing: cubicOut }}
	>
		<!-- Background image -->
		<div
			class="absolute inset-0 bg-cover bg-center bg-no-repeat"
			style="background-image: url('{base}/img/splash.jpg');"
			aria-hidden="true"
		></div>
		<!-- Dark green to black gradient overlay -->
		<div
			class="absolute inset-0"
			style="background: linear-gradient(to bottom, rgba(20, 50, 20, 0.72) 0%, rgba(0, 0, 0, 0.92) 100%);"
			aria-hidden="true"
		></div>
		<div class="relative z-10 w-full max-w-2xl px-8 flex flex-col items-center gap-8">
			<h2 class="text-stone-100 text-center leading-tight" style="font-family: var(--font-serif); font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 700;">
				Find Native Plants for Your Ecoregion and Hardiness Zone
			</h2>
			<div class="w-full flex flex-col gap-3">
				<SearchBar
					variant="splash"
					bind:searchQuery
					bind:mode={searchMode}
					bind:plantQuery
					onSearch={searchLocation}
					onPlantSearch={searchPlantByName}
					onClearPlantSearch={clearPlantSearch}
					onFindLocation={findMyLocation}
				/>

				<!-- Optional pre-filters: narrow results before searching -->
				<div class="flex flex-col gap-2">
					<button
						class="flex items-center gap-1.5 self-start text-[13px] text-stone-200 hover:text-white"
						onclick={() => (showSplashFilters = !showSplashFilters)}
						aria-expanded={showSplashFilters}
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h18M7 12h10M11 20h2" />
						</svg>
						Refine (optional)
						{#if splashFilterCount > 0}
							<span class="rounded-full bg-lime-600 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
								{splashFilterCount}
							</span>
						{/if}
						<svg class="w-3 h-3 transition-transform {showSplashFilters ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					{#if showSplashFilters}
						<div class="rounded border border-stone-500/50 bg-black/20 p-3">
							<PlantFilters filters={plantFilters} variant="splash" />
							{#if splashFilterCount > 0}
								<button
									class="mt-3 text-[11px] text-stone-300 underline hover:text-white"
									onclick={() => clearPlantFilters(plantFilters)}
								>
									Clear all
								</button>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
		<p class="absolute bottom-4 left-0 right-0 z-10 text-center text-xs text-stone-300/80">
			© 2025-{new Date().getFullYear()} White Flower Farm and Sustainable Gardening Institute
		</p>
	</div>
{:else}
	<div
		class="flex flex-col flex-1 overflow-hidden"
		in:fly={{ y: 80, duration: 500, delay: 100, easing: cubicOut }}
	>
		<SearchBar
			bind:searchQuery
			bind:mode={searchMode}
			bind:plantQuery
			onSearch={searchLocation}
			onPlantSearch={searchPlantByName}
			onClearPlantSearch={clearPlantSearch}
			onFindLocation={findMyLocation}
			searchResultAddress={searchResultAddress}
		/>

		<!-- Stacked layout: map+info row, then full-width plant grid -->
		<div
			bind:this={resultsScrollEl}
			onscroll={handleResultsScroll}
			class="relative flex flex-col flex-1 overflow-y-auto border-t border-stone-700"
		>

			{#if !currentCoords && plantSearchActive}
				<!-- Plant search with no location set: prompt the user to add one -->
				<div class="w-full border-b border-stone-700 bg-stone-200 px-4 py-3 text-sm text-stone-700">
					Set a location to check whether these plants suit your area.
					<button class="ml-1 font-semibold text-lime-900 underline" onclick={() => (searchMode = 'location')}>
						Search by location
					</button>
				</div>
			{:else}
			<!-- Full-width row: map on left, location info on right (zone + ecoregion columns on large screens) -->
			<div id="location-info" class="relative z-20 flex flex-col sm:flex-row w-full h-[400px] border-b border-stone-700 shrink-0">

				<!-- Map -->
				<div class="sm:w-3/5 relative bg-stone-100 flex-shrink-0">
					<div class="w-full h-[400px] sm:h-full overflow-hidden">
						<Map bind:this={mapRef} center={currentCoords ? [currentCoords.lat, currentCoords.lng] : undefined} zoom={currentCoords ? 6 : undefined} marker={currentCoords ? { lat: currentCoords.lat, lng: currentCoords.lng } : undefined} shapefiles={selectedLayers.map(layer => layer.path)} colorArray={hardinessZoneColors} showNurseries={showNurseries} onMapClick={handleMapClick} onZoomChange={handleZoomChange} />
					</div>
					<div class="absolute top-4 right-4" style="z-index: 1000;">
						<button
							class="border border-lime-950 rounded bg-stone-100 px-4 py-2 text-lime-950 font-bold flex items-center justify-between shadow-md hover:bg-stone-50"
							onclick={() => showLayersDropdown = !showLayersDropdown}
							aria-haspopup="true"
							aria-expanded={showLayersDropdown}
						>
							<span>Layers ({selectedLayers.length + (showNurseries ? 1 : 0)})</span>
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
								<!-- Independent add-on layer: toggles on top of whichever polygon layer (if any) is active. -->
								<button
									class={`flex w-full items-center justify-start px-4 py-5 text-l ${showNurseries ? 'active bg-lime-200 font-bold' : 'cursor-pointer bg-stone-100 hover:bg-lime-100'}`}
									onclick={toggleNurseries}
									title="Grouped into clusters when zoomed out; zoom in to see individual nurseries"
								>
									<span class="mr-2">{showNurseries ? '☑' : '☐'}</span>
									<span>Native Plant Nurseries</span>
								</button>
							</div>
						{/if}
					</div>
				</div>

				<!-- Right side: location info (location, zone, ecoregion columns) -->
				<div class="sm:w-2/5 flex flex-col bg-stone-200 sm:border-l border-stone-700 overflow-y-auto">
					<LocationInfo
						searchResultAddress={searchResultAddress}
						pointLayerData={pointLayerData}
						layers={layers}
						onEditLocation={handleLocationReset}
					/>
				</div>

			</div>
			{/if}

			<!-- Full-width plant grid -->
			<div bind:this={plantListEl} class="w-full bg-stone-300">
				{#if plantSearchActive}
					<PlantSearchResults
						results={plantSearchResults}
						term={plantSearchTerm}
						loading={plantSearchLoading}
						error={plantSearchError}
						hasLocation={!!searchResultAddress?.postcode}
					/>
				{:else}
					<CandidatePlants
						zipcode={searchResultAddress?.postcode}
						ecoregion={searchResultAddress?.postcode ? undefined : pointLayerData.ecoregions?.NA_L3CODE}
						phzZone={searchResultAddress?.postcode ? undefined : pointLayerData.phz?.zone}
						filters={plantFilters}
					/>
				{/if}
			</div>

			<!-- Mobile-only scroll hint: nudges users toward the native plant list below -->
			{#if scrollHintVisible}
				<button
					type="button"
					onclick={scrollToPlants}
					transition:fade={{ duration: 200 }}
					class="sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[1100] flex flex-col items-center gap-1.5"
					aria-label="Scroll down to see native plants"
				>
					<span class="rounded-full bg-lime-950/90 px-4 py-1.5 text-xs font-semibold text-stone-100 shadow-lg backdrop-blur-sm">
						See local native plants
					</span>
					<span class="flex h-9 w-9 items-center justify-center rounded-full bg-lime-950 shadow-lg animate-bounce">
						<svg
							class="h-5 w-5 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
						</svg>
					</span>
				</button>
			{/if}

		</div>
	</div>
{/if}
