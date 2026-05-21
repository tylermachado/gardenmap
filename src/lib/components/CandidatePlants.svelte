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
		<div class="mt-3 flex flex-wrap gap-2">
			<select
				bind:value={filterPlantType}
				class="rounded border border-stone-400 bg-stone-100 px-2 py-1 text-[12px]"
			>
				<option value="">All plant types</option>
				{#each plantTypeOptions as opt}
					<option value={opt}>{opt}</option>
				{/each}
			</select>

			<select
				bind:value={filterSunShade}
				class="rounded border border-stone-400 bg-stone-100 px-2 py-1 text-[12px]"
			>
				<option value="">All sun/shade</option>
				{#each sunShadeOptions as opt}
					<option value={opt}>{opt}</option>
				{/each}
			</select>

			<select
				bind:value={filterMoisture}
				class="rounded border border-stone-400 bg-stone-100 px-2 py-1 text-[12px]"
			>
				<option value="">All moisture levels</option>
				{#each moistureOptions as opt}
					<option value={opt}>{opt}</option>
				{/each}
			</select>

			{#if filterPlantType || filterSunShade || filterMoisture || filterPollinators.size > 0}
				<button
					class="rounded border border-stone-400 bg-stone-200 px-2 py-1 text-[12px] hover:bg-stone-300"
					onclick={() => { filterPlantType = ''; filterSunShade = ''; filterMoisture = ''; filterPollinators = new Set(); }}
				>
					Clear filters
				</button>
			{/if}

			<span class="self-center text-[11px] italic text-stone-500">
				{filteredPlants.length} of {plants.length}
			</span>
		</div>

		<div class="mt-2 flex flex-wrap gap-x-3 gap-y-1">
			<span class="self-center text-[11px] text-stone-500">Attracts:</span>
			{#each POLLINATOR_KEYS as { key, label }}
				<label class="flex cursor-pointer items-center gap-1 text-[12px]">
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
