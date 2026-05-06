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

			{#if filterPlantType || filterSunShade || filterMoisture}
				<button
					class="rounded border border-stone-400 bg-stone-200 px-2 py-1 text-[12px] hover:bg-stone-300"
					onclick={() => { filterPlantType = ''; filterSunShade = ''; filterMoisture = ''; }}
				>
					Clear filters
				</button>
			{/if}

			<span class="self-center text-[11px] italic text-stone-500">
				{filteredPlants.length} of {plants.length}
			</span>
		</div>

		<div class="grid w-full grid-cols-5 gap-2 p-4">
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
