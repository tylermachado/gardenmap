<script lang="ts">
	import PlantIcon1 from '$lib/icons/noun-plant-6741.svg';
	import PlantModal from '$lib/components/PlantModal.svelte';
	import PlantFilters from '$lib/components/PlantFilters.svelte';
	import type { PlantSummary } from '$lib/types/plant.js';
	import {
		createPlantFilters,
		clearPlantFilters,
		countActiveFilters,
		hasActiveFilters,
		applyPlantFilterParams,
		type PlantFilterState,
	} from '$lib/plant-filters.js';

	const IMG_BASE_URL = 'https://d10s8hlfsm6n8p.cloudfront.net/images/';
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

	function locationParams(): URLSearchParams {
		const params = new URLSearchParams();
		if (ecoregion) params.set('ecoregion', ecoregion);
		if (phzZone) params.set('zone', phzZone);
		if (zipcode) params.set('zipcode', zipcode);
		return params;
	}

	/** Fetch the unfiltered total for this location to seed the "of N" count. */
	function seedTotals(signal: AbortSignal) {
		fetch(`/api/plants?${locationParams().toString()}`, { signal })
			.then((res) => {
				if (res.status === 500) return makePlaceholderPlants();
				if (!res.ok) throw new Error(`Request failed: ${res.status}`);
				return res.json() as Promise<PlantSummary[]>;
			})
			.then((data) => {
				allSummaries = data;
			})
			.catch((err: unknown) => {
				if (err instanceof Error && err.name === 'AbortError') return;
			});
	}

	// Plain (non-reactive) variable used to detect location changes without itself being a tracked dep
	let prevLocationKey = '';

	$effect(() => {
		// Read ALL reactive deps at the top so Svelte tracks them even when we return early
		const locationKey = [ecoregion, phzZone, zipcode].join('|');
		const ft = filters.plantType;
		const fs = filters.sunShade;
		const fm = filters.moisture;
		const fp = filters.pollinators;

		if (!ecoregion && !phzZone && !zipcode) {
			prevLocationKey = locationKey;
			allSummaries = [];
			plants = [];
			loading = false;
			return;
		}

		const isNewLocation = locationKey !== prevLocationKey;
		// A real previous location (not the initial mount or the empty/no-location key).
		const hadRealPreviousLocation =
			isNewLocation && prevLocationKey !== '' && prevLocationKey !== '||';

		// Moving between two real locations: drop stale filters (selections may not fit the
		// new place). The very first load is exempt so splash pre-selections survive.
		if (hadRealPreviousLocation) {
			prevLocationKey = locationKey;
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

		// First load arriving with pre-selected filters (from the splash): the main fetch is
		// filtered, so seed the unfiltered total separately for the "of N" count.
		if (isNewLocation && filtersActive) {
			seedTotals(controller.signal);
		}

		fetch(`/api/plants?${params.toString()}`, { signal: controller.signal })
			.then((res) => {
				if (res.status === 500) {
					const placeholders = makePlaceholderPlants();
					plants = placeholders;
					if (!filtersActive) allSummaries = placeholders;
					return null;
				}
				if (!res.ok) throw new Error(`Request failed: ${res.status}`);
				return res.json() as Promise<PlantSummary[]>;
			})
			.then((data) => {
				if (data === null) return;
				plants = data;
				// An unfiltered fetch also seeds the total for the "of N" count.
				if (!filtersActive) allSummaries = data;
			})
			.catch((err: unknown) => {
				if (err instanceof Error && err.name === 'AbortError') return;
				error = err instanceof Error ? err.message : 'Unknown error';
				plants = [];
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
							src={plant.img_file_name?.length ? `${IMG_BASE_URL}${plant.img_file_name[0]}` : (plant.image_url ?? PlantIcon1)}
							alt={plant.scientific_name}
							class="h-full w-full object-cover"
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
