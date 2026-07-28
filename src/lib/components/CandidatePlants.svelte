<script lang="ts">
	import { onMount } from 'svelte';
	import PlantModal from '$lib/components/PlantModal.svelte';
	import PlantFilters from '$lib/components/PlantFilters.svelte';
	import type { PlantSummary } from '$lib/types/plant.js';
	import { fetchCandidatePlants, fetchPlantDetail } from '$lib/api/plants.js';
	import { page } from '$app/stores';
	import {
		createPlantFilters,
		clearPlantFilters,
		countActiveFilters,
		hasActiveFilters,
		applyPlantFilterParams,
		type PlantFilterState,
	} from '$lib/plant-filters.js';

	const IMG_BASE_URL = 'https://d10s8hlfsm6n8p.cloudfront.net/images/';
	const PlantIcon1 = '/logos/plant.svg';
	const PAGE_SIZE = 20;

	interface CandidatePlantsProps {
		ecoregion?: string;
		phzZone?: string;
		zipcode?: string;
		/** Shared filter selection, owned by the parent so splash pre-selections survive. */
		filters?: PlantFilterState;
	}

	let { ecoregion, phzZone, zipcode, filters = createPlantFilters() }: CandidatePlantsProps = $props();

	// allSummaries: unfiltered total for this location; drives the "X of Y" count
	let allSummaries: PlantSummary[] = $state([]);
	// plants: current server-filtered result set displayed in the grid
	let plants: PlantSummary[] = $state([]);
	let loading = $state(false);
	let error: string | null = $state(null);
	let selectedPlant: PlantSummary | null = $state(null);
	// The backend's per-zipcode data can be incomplete. When a zipcode lookup comes back
	// empty, fall back to the ecoregion/hardiness-zone already resolved client-side
	// (point-in-polygon against the bundled geodata) instead of showing nothing.
	let usingFallback = $state(false);

	// A shared link (?plant=<id>) reopens that plant's modal on load, independent of
	// whatever location/filters are also in the URL.
	onMount(() => {
		const sharedId = $page.url.searchParams.get('plant');
		if (!sharedId) return;
		fetchPlantDetail(sharedId)
			.then((detail) => {
				selectedPlant = detail;
			})
			.catch(() => {
				// Unknown/removed plant id: ignore, modal simply doesn't open.
			});
	});

	let displayCount = $state(PAGE_SIZE);
	let sentinelEl: HTMLDivElement | undefined = $state();

	const visiblePlants = $derived(plants.slice(0, displayCount));
	const hasMoreToDisplay = $derived(displayCount < plants.length);

	$effect(() => {
		const el = sentinelEl;
		if (!el) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					displayCount += PAGE_SIZE;
				}
			},
			{ rootMargin: '300px' }
		);
		observer.observe(el);
		return () => observer.disconnect();
	});

	function makePlaceholderPlants(): PlantSummary[] {
		return Array.from({ length: 25 }, (_, i) => ({
			id: `placeholder-${i + 1}`,
			name: `Placeholder ${i + 1}`,
			scientific_name: `Species placeholder ${i + 1}`,
			common_name: ['Placeholder plant'],
		} satisfies PlantSummary));
	}

	let showFilters = $state(false);

	const activeFilterCount = $derived(countActiveFilters(filters));

	// Zipcode takes priority over ecoregion/zone, unless the zipcode lookup already came
	// back empty for this location (see maybeFallBackToLocation below).
	function locationParams(): URLSearchParams {
		const params = new URLSearchParams();
		if (zipcode && !usingFallback) {
			params.set('zipcode', zipcode);
			return params;
		}
		if (ecoregion) params.set('ecoregion', ecoregion);
		// The API takes the hardiness zone as a bare integer (e.g. "7b" -> "7").
		if (phzZone) params.set('hardiness_zone', phzZone.match(/^\d+/)?.[0] ?? phzZone);
		return params;
	}

	/** Fetch the unfiltered total for this location to seed the "of N" count. */
	function seedTotals(signal: AbortSignal) {
		fetchCandidatePlants(locationParams(), signal)
			.then((data) => {
				allSummaries = data;
				maybeFallBackToLocation(data);
			})
			.catch((err: unknown) => {
				// Ignore aborts and backend errors; the "of N" count just stays hidden.
				if (err instanceof Error && err.name === 'AbortError') return;
			});
	}

	/**
	 * If a zipcode-based lookup came back with zero plants total (not just zero after
	 * filtering) and we have ecoregion/hardiness-zone data for this spot, switch to
	 * querying by those instead. One-shot per location: `usingFallback` only flips false->true.
	 */
	function maybeFallBackToLocation(unfilteredData: PlantSummary[]) {
		if (!usingFallback && zipcode && (ecoregion || phzZone) && unfilteredData.length === 0) {
			usingFallback = true;
		}
	}

	// Plain (non-reactive) variables used to detect location/fallback changes without
	// themselves being tracked deps.
	let prevLocationKey = '';
	let prevUsingFallback = false;

	$effect(() => {
		// Read ALL reactive deps at the top so Svelte tracks them even when we return early.
		// Identity is zipcode alone when present: ecoregion/phzZone resolve asynchronously
		// (point-in-polygon lookup) slightly after the zipcode is known, and that arrival
		// shouldn't be treated as a brand-new location (which would clear filters/results).
		const locationKey = zipcode || [ecoregion, phzZone].join('|');
		const ft = filters.plantType;
		const fs = filters.sunShade;
		const fm = filters.moisture;
		const fp = filters.pollinators;

		if (!ecoregion && !phzZone && !zipcode) {
			prevLocationKey = locationKey;
			prevUsingFallback = usingFallback = false;
			allSummaries = [];
			plants = [];
			loading = false;
			return;
		}

		const isNewLocation = locationKey !== prevLocationKey;
		// A real previous location (not the initial mount or the empty/no-location key).
		const hadRealPreviousLocation =
			isNewLocation && prevLocationKey !== '' && prevLocationKey !== '|';

		// Moving between two real locations: drop stale filters (selections may not fit the
		// new place). The very first load is exempt so splash pre-selections survive.
		if (hadRealPreviousLocation) {
			prevLocationKey = locationKey;
			prevUsingFallback = usingFallback = false;
			allSummaries = [];
			plants = [];
			loading = true;
			error = null;
			showFilters = false;
			clearPlantFilters(filters); // schedules a re-run with empty filters
			return;
		}

		if (isNewLocation) {
			prevLocationKey = locationKey;
		}

		const filtersActive = hasActiveFilters(filters);

		const params = locationParams();
		applyPlantFilterParams(filters, params);

		loading = true;
		error = null;
		displayCount = PAGE_SIZE;

		const controller = new AbortController();

		// Re-seed the unfiltered total whenever this is a new location OR the zip->ecoregion
		// fallback just switched on (the previously seeded total was zip-based and is now stale).
		const fallbackJustSwitched = usingFallback !== prevUsingFallback;
		prevUsingFallback = usingFallback;
		if ((isNewLocation || fallbackJustSwitched) && filtersActive) {
			seedTotals(controller.signal);
		}

		fetchCandidatePlants(params, controller.signal)
			.then((data) => {
				plants = data;
				// An unfiltered fetch also seeds the total for the "of N" count.
				if (!filtersActive) {
					allSummaries = data;
					maybeFallBackToLocation(data);
				}
			})
			.catch((err: unknown) => {
				if (err instanceof Error && err.name === 'AbortError') return;
				// Backend unreachable: fall back to a placeholder demo grid.
				const placeholders = makePlaceholderPlants();
				plants = placeholders;
				if (!filtersActive) allSummaries = placeholders;
			})
			.finally(() => {
				loading = false;
			});

		return () => controller.abort();
	});

	// Show the filter UI once there are results or active (e.g. pre-selected) filters.
	const showFilterControls = $derived(plants.length > 0 || activeFilterCount > 0);
</script>

<div class="w-full items-start p-4 text-left">
	<h3 class="w-full items-start text-left">Native Plant Species</h3>
	<p>Plants native to this ecoregion <em>and</em> generally considered winter hardy in this zone</p>

	{#if loading}
		<p class="mt-2 text-[11px] italic text-stone-600">Loading plants…</p>
	{:else if error}
		<p class="mt-2 text-[11px] italic text-red-600">{error}</p>
	{:else if showFilterControls}
		<!-- Filter toggle bar: always visible -->
		<div class="mt-3 flex items-center gap-3">
			<button
				class="flex items-center gap-1.5 rounded border px-3 py-1.5 text-[12px] font-medium transition-colors
					{showFilters ? 'border-lime-800 bg-lime-100 text-lime-900' : 'border-stone-400 bg-stone-100 text-stone-700 hover:bg-stone-200'}"
				onclick={() => (showFilters = !showFilters)}
				aria-expanded={showFilters}
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h18M7 12h10M11 20h2" />
				</svg>
				Filters
				{#if activeFilterCount > 0}
					<span class="ml-0.5 rounded-full bg-lime-700 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
						{activeFilterCount}
					</span>
				{/if}
				<svg class="w-3 h-3 ml-0.5 transition-transform {showFilters ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			<span class="text-[11px] italic text-stone-500">
				{plants.length}{allSummaries.length > 0 ? ` of ${allSummaries.length}` : ''}
			</span>

			{#if activeFilterCount > 0}
				<button
					class="text-[11px] text-stone-500 underline hover:text-stone-700"
					onclick={() => clearPlantFilters(filters)}
				>
					Clear all
				</button>
			{/if}
		</div>

		<!-- Collapsible filter panel -->
		{#if showFilters}
			<div class="mt-2 rounded border border-stone-300 bg-stone-100 p-3">
				<PlantFilters {filters} variant="panel" />
			</div>
		{/if}

		{#if plants.length === 0 && activeFilterCount > 0}
			<p class="mt-3 text-[11px] italic text-stone-500">No plants match these filters.</p>
		{:else}
		<div class="grid w-full grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2 p-4">
			{#each visiblePlants as plant (plant.id)}
				<button
					type="button"
					class="flex cursor-pointer flex-col items-center gap-1 rounded p-1 hover:bg-stone-100"
					onclick={() => (selectedPlant = plant)}
				>
					<div class="w-full" style="aspect-ratio: 4/5; overflow: hidden; border-radius: 0.25rem;">
						<img
							src={plant.images?.length ? `${IMG_BASE_URL}${plant.images[0].img_file_name}` : (plant.image_url ?? PlantIcon1)}
							alt={plant.scientific_name}
							class="h-full w-full {plant.images?.length || plant.image_url ? 'object-cover' : 'object-contain p-4'}"
							loading="lazy"
						/>
					</div>
					<span class="text-center text-[12px] leading-tight">{plant.scientific_name}</span>
					<span class="text-center text-[10px] leading-tight italic">
						{plant.common_name.join(', ')}
					</span>
				</button>
			{/each}
		</div>
		{#if hasMoreToDisplay}
			<div bind:this={sentinelEl} class="h-4 w-full" aria-hidden="true"></div>
		{/if}
		{/if}
	{:else if ecoregion || phzZone || zipcode}
		<p class="mt-2 text-[11px] italic text-stone-600">No candidate plants found.</p>
	{/if}
</div>

{#if selectedPlant}
	<PlantModal plant={selectedPlant} onclose={() => (selectedPlant = null)} />
{/if}
