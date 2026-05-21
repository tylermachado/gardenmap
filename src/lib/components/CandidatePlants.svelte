<script lang="ts">
	import PlantIcon1 from '$lib/icons/noun-plant-6741.svg';
	import PlantModal from '$lib/components/PlantModal.svelte';
	import type { Plant } from '$lib/types/plant.js';

	interface CandidatePlantsProps {
		ecoregion?: string;
		phzZone?: string;
		zipcode?: string;
	}

	let { ecoregion, phzZone, zipcode }: CandidatePlantsProps = $props();

	let plants: Plant[] = $state([]);
	let loading = $state(false);
	let error: string | null = $state(null);
	let selectedPlant: Plant | null = $state(null);

	let filterPlantType = $state('');
	let filterSunShade = $state('');
	let filterMoisture = $state('');
	let filterPollinators = $state(new Set<string>());

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

	const POLLINATOR_KEYS: { key: keyof Plant; label: string }[] = [
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

	const plantTypeOptions = $derived(
		[...new Set(plants.flatMap((p) => p.plant_type ?? []))].sort()
	);
	const sunShadeOptions = $derived(
		[...new Set(plants.flatMap((p) => p.sun_and_shade ?? []))].sort()
	);
	const moistureOptions = $derived(
		[...new Set(plants.flatMap((p) => p.soil_moisture ?? []))].sort()
	);

	const filteredPlants = $derived(
		plants.filter((p) => {
			if (filterPlantType && !(p.plant_type ?? []).includes(filterPlantType)) return false;
			if (filterSunShade && !(p.sun_and_shade ?? []).includes(filterSunShade)) return false;
			if (filterMoisture && !(p.soil_moisture ?? []).includes(filterMoisture)) return false;
			if (filterPollinators.size > 0 && ![...filterPollinators].some((k) => p[k as keyof Plant])) return false;
			return true;
		})
	);

	$effect(() => {
		if (!ecoregion && !phzZone && !zipcode) {
			plants = [];
			return;
		}

		loading = true;
		error = null;
		filterPlantType = '';
		filterSunShade = '';
		filterMoisture = '';
		filterPollinators = new Set();
		showFilters = false;
		showAttractsDropdown = false;

		const params = new URLSearchParams({ offset: '0' });
		if (ecoregion) params.set('ecoregion', ecoregion);
		if (phzZone) params.set('zone', phzZone);
		if (zipcode) params.set('zipcode', zipcode);

		fetch(`/api/plants?${params.toString()}`)
			.then((res) => {
				if (!res.ok) throw new Error(`Request failed: ${res.status}`);
				return res.json() as Promise<Plant[]>;
			})
			.then((data) => {
				plants = data;
			})
			.catch((err: unknown) => {
				error = err instanceof Error ? err.message : 'Unknown error';
				plants = [];
			})
			.finally(() => {
				loading = false;
			});
	});
</script>

<div class="w-full items-start p-4 text-left">
	<h3 class="w-full items-start text-left">Native Plant Species</h3>
	<p>Plants native to this ecoregion <em>and</em> generally considered winter hardy in this zone</p>

	{#if loading}
		<p class="mt-2 text-[11px] italic text-stone-600">Loading plants…</p>
	{:else if error}
		<p class="mt-2 text-[11px] italic text-red-600">{error}</p>
	{:else if plants.length > 0}
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
				{filteredPlants.length} of {plants.length}
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

		<div class="grid w-full grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2 p-4">
			{#each filteredPlants as plant (plant.id)}
				<button
					type="button"
					class="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded p-1 hover:bg-stone-100"
					onclick={() => (selectedPlant = plant)}
				>
					<img src={plant.image_url ?? PlantIcon1} alt={plant.scientific_name} class="h-xl w-xl" />
					<span class="text-center text-[12px] leading-tight">{plant.scientific_name}</span>
					<span class="text-center text-[10px] leading-tight italic">
						{plant.common_name.join(', ')}
					</span>
				</button>
			{/each}
		</div>
	{:else if ecoregion || phzZone || zipcode}
		<p class="mt-2 text-[11px] italic text-stone-600">No candidate plants found.</p>
	{/if}
</div>

{#if selectedPlant}
	<PlantModal plant={selectedPlant} onclose={() => (selectedPlant = null)} />
{/if}
