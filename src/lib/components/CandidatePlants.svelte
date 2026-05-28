<script lang="ts">
	import PlantIcon1 from '$lib/icons/noun-plant-6741.svg';
	import PlantModal from '$lib/components/PlantModal.svelte';
	import type { PlantSummary } from '$lib/types/plant.js';

	const IMG_BASE_URL = 'https://d10s8hlfsm6n8p.cloudfront.net/images/';
	const PAGE_SIZE = 20;

	interface CandidatePlantsProps {
		ecoregion?: string;
		phzZone?: string;
		zipcode?: string;
	}

	let { ecoregion, phzZone, zipcode }: CandidatePlantsProps = $props();

	// allSummaries: unfiltered set for this location; drives filter dropdown options
	let allSummaries: PlantSummary[] = $state([]);
	// plants: current server-filtered result set displayed in the grid
	let plants: PlantSummary[] = $state([]);
	let loading = $state(false);
	let error: string | null = $state(null);
	let selectedPlant: PlantSummary | null = $state(null);

	let filterPlantType = $state('');
	let filterSunShade = $state('');
	let filterMoisture = $state('');
	let filterPollinators = $state(new Set<string>());

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
	let showAttractsDropdown = $state(false);

	const activeFilterCount = $derived(
		(filterPlantType ? 1 : 0) +
		(filterSunShade ? 1 : 0) +
		(filterMoisture ? 1 : 0) +
		(filterPollinators.size > 0 ? 1 : 0)
	);

	function clearFilters() {
		filterPlantType = '';
		filterSunShade = '';
		filterMoisture = '';
		filterPollinators = new Set();
	}

	const POLLINATOR_KEYS: { key: keyof PlantSummary; label: string }[] = [
		{ key: 'monarchs', label: 'Monarchs' },
		{ key: 'native_bees', label: 'Native bees' },
		{ key: 'honey_bees', label: 'Honey bees' },
		{ key: 'bombus', label: 'Bumblebees' },
		{ key: 'butterflies', label: 'Butterflies' },
		{ key: 'moths', label: 'Moths' },
		{ key: 'hummingbirds', label: 'Hummingbirds' },
		{ key: 'beetles_wasps_flies', label: 'Beetles/wasps/flies' },
		{ key: 'bats', label: 'Bats' },
		{ key: 'nesting_and_structure_bees', label: 'Nesting bees' },
		{ key: 'larval_host_monarch', label: 'Larval host: monarch' },
		{ key: 'larval_host_butterfly', label: 'Larval host: butterfly' },
		{ key: 'larval_host_moth', label: 'Larval host: moth' },
	];

	// Dropdown options always derived from allSummaries (stable; don't shift when filters are applied)
	const plantTypeOptions = $derived(
		[...new Set(allSummaries.flatMap((p) => p.plant_type ?? []))].sort()
	);
	const sunShadeOptions = $derived(
		[...new Set(allSummaries.flatMap((p) => p.sun_and_shade ?? []))].sort()
	);
	const moistureOptions = $derived(
		[...new Set(allSummaries.flatMap((p) => p.soil_moisture ?? []))].sort()
	);

	// Plain (non-reactive) variable used to detect location changes without itself being a tracked dep
	let prevLocationKey = '';

	$effect(() => {
		// Read ALL reactive deps at the top so Svelte tracks them even when we return early
		const locationKey = [ecoregion, phzZone, zipcode].join('|');
		const ft = filterPlantType;
		const fs = filterSunShade;
		const fm = filterMoisture;
		const fp = filterPollinators;

		if (!ecoregion && !phzZone && !zipcode) {
			prevLocationKey = locationKey;
			allSummaries = [];
			plants = [];
			loading = false;
			return;
		}

		const isNewLocation = locationKey !== prevLocationKey;

		if (isNewLocation) {
			// Update key FIRST so the re-run (triggered by filter resets below) sees isNewLocation = false
			prevLocationKey = locationKey;
			allSummaries = [];
			plants = [];
			loading = true;
			error = null;
			showFilters = false;
			showAttractsDropdown = false;
			// Writing these tracked deps schedules the effect to re-run with empty filters
			filterPlantType = '';
			filterSunShade = '';
			filterMoisture = '';
			filterPollinators = new Set();
			return;
		}

		const hasFilters = !!(ft || fs || fm || fp.size > 0);

		const params = new URLSearchParams();
		if (ecoregion) params.set('ecoregion', ecoregion);
		if (phzZone) params.set('zone', phzZone);
		if (zipcode) params.set('zipcode', zipcode);
		if (ft) params.set('plant_type', ft);
		if (fs) params.set('sun_and_shade', fs);
		if (fm) params.set('soil_moisture', fm);
		for (const k of [...fp]) params.set(k, 'true');

		loading = true;
		error = null;
		displayCount = PAGE_SIZE;

		const controller = new AbortController();

		fetch(`/api/plants?${params.toString()}`, { signal: controller.signal })
			.then((res) => {
				if (res.status === 500) {
					const placeholders = makePlaceholderPlants();
					plants = placeholders;
					if (!hasFilters) allSummaries = placeholders;
					return null;
				}
				if (!res.ok) throw new Error(`Request failed: ${res.status}`);
				return res.json() as Promise<PlantSummary[]>;
			})
			.then((data) => {
				if (data === null) return;
				plants = data;
				// The first fetch for a new location (no filters) also seeds the dropdown options
				if (!hasFilters) allSummaries = data;
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
</script>

<div class="w-full items-start p-4 text-left">
	<h3 class="w-full items-start text-left">Native Plant Species</h3>
	<p>Plants native to this ecoregion <em>and</em> generally considered winter hardy in this zone</p>

	{#if loading}
		<p class="mt-2 text-[11px] italic text-stone-600">Loading plants…</p>
	{:else if error}
		<p class="mt-2 text-[11px] italic text-red-600">{error}</p>
	{:else if allSummaries.length > 0}
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
				{plants.length} of {allSummaries.length}
			</span>

			{#if activeFilterCount > 0}
				<button
					class="text-[11px] text-stone-500 underline hover:text-stone-700"
					onclick={clearFilters}
				>
					Clear all
				</button>
			{/if}
		</div>

		<!-- Collapsible filter panel -->
		{#if showFilters}
			<div class="mt-2 flex flex-wrap items-end gap-3 rounded border border-stone-300 bg-stone-100 p-3">
				<label class="flex flex-col gap-1 text-[11px] text-stone-600">
					Plant type
					<select bind:value={filterPlantType} class="rounded border border-stone-400 bg-white px-2 py-1 text-[12px]">
						<option value="">All</option>
						{#each plantTypeOptions as opt}
							<option value={opt}>{opt}</option>
						{/each}
					</select>
				</label>

				<label class="flex flex-col gap-1 text-[11px] text-stone-600">
					Sun / shade
					<select bind:value={filterSunShade} class="rounded border border-stone-400 bg-white px-2 py-1 text-[12px]">
						<option value="">All</option>
						{#each sunShadeOptions as opt}
							<option value={opt}>{opt}</option>
						{/each}
					</select>
				</label>

				<label class="flex flex-col gap-1 text-[11px] text-stone-600">
					Moisture
					<select bind:value={filterMoisture} class="rounded border border-stone-400 bg-white px-2 py-1 text-[12px]">
						<option value="">All</option>
						{#each moistureOptions as opt}
							<option value={opt}>{opt}</option>
						{/each}
					</select>
				</label>

				<!-- Attracts: custom multi-select dropdown -->
				<div class="flex flex-col gap-1 text-[11px] text-stone-600 relative">
					Attracts
					<button
						class="flex items-center gap-1 rounded border px-2 py-1 text-[12px] text-left
							{filterPollinators.size > 0 ? 'border-lime-700 bg-lime-50 text-lime-900 font-medium' : 'border-stone-400 bg-white text-stone-700'}"
						onclick={() => (showAttractsDropdown = !showAttractsDropdown)}
						aria-expanded={showAttractsDropdown}
					>
						{filterPollinators.size > 0 ? `${filterPollinators.size} selected` : 'Any'}
						<svg class="w-3 h-3 ml-auto transition-transform {showAttractsDropdown ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					{#if showAttractsDropdown}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="absolute top-full left-0 z-20 mt-1 w-52 rounded border border-stone-300 bg-white shadow-lg"
							onmouseleave={() => (showAttractsDropdown = false)}
						>
							<div class="max-h-64 overflow-y-auto p-2 flex flex-col gap-1">
								{#each POLLINATOR_KEYS as { key, label }}
									<label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[12px] hover:bg-stone-100">
										<input
											type="checkbox"
											checked={filterPollinators.has(key)}
											onchange={(e) => {
												const next = new Set(filterPollinators);
												if ((e.target as HTMLInputElement).checked) next.add(key);
												else next.delete(key);
												filterPollinators = next;
											}}
										/>
										{label}
									</label>
								{/each}
							</div>
							{#if filterPollinators.size > 0}
								<div class="border-t border-stone-200 px-3 py-1.5">
									<button class="text-[11px] text-stone-500 underline hover:text-stone-700" onclick={() => (filterPollinators = new Set())}>
										Clear
									</button>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/if}

		{#if plants.length === 0 && activeFilterCount > 0}
			<p class="mt-3 text-[11px] italic text-stone-500">No plants match these filters.</p>
		{:else}
		<div class="grid w-full grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2 p-4">
			{#each visiblePlants as plant (plant.id)}
				<button
					type="button"
					class="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded p-1 hover:bg-stone-100"
					onclick={() => (selectedPlant = plant)}
				>
					<img
						src={plant.img_file_name?.length ? `${IMG_BASE_URL}${plant.img_file_name[0]}` : (plant.image_url ?? PlantIcon1)}
						alt={plant.scientific_name}
						class="h-xl w-xl"
						loading="lazy"
					/>
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
