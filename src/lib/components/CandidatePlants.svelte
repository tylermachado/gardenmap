<script lang="ts">
	import PlantIcon1 from '$lib/icons/noun-plant-6741.svg';

	interface Plant {
		id: string;
		name: string;
		scientific_name?: string;
        common_name: Array<
            string
        >;
	}

	interface CandidatePlantsProps {
		ecoregion?: string;
		phzZone?: string;
		zipcode?: string;
	}

	let { ecoregion, phzZone, zipcode }: CandidatePlantsProps = $props();

	let plants: Plant[] = $state([]);
	let loading = $state(false);
	let error: string | null = $state(null);

	$effect(() => {
		if (!ecoregion && !phzZone && !zipcode) {
			plants = [];
			return;
		}

		loading = true;
		error = null;

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
	<h3 class="w-full items-start text-left">Candidate Plants</h3>
	<p>native to this ecoregion <em>and</em> generally considered winter hardy in this zone</p>

	{#if loading}
		<p class="mt-2 text-[11px] italic text-stone-600">Loading plants…</p>
	{:else if error}
		<p class="mt-2 text-[11px] italic text-red-600">{error}</p>
	{:else if plants.length > 0}
		<div class="grid w-full grid-cols-5 gap-2 p-4">
			{#each plants as plant (plant.id)}
				<div class="flex aspect-square flex-col items-center justify-center gap-1">
					<img src={PlantIcon1} alt={plant.scientific_name} class="h-xl w-xl" />
					<span class="text-center text-[12px] leading-tight">{plant.scientific_name}</span>
                   <span class="text-center text-[10px] leading-tight italic">
                        {plant.common_name.join(', ')}
                    </span>
				</div>
			{/each}
		</div>
	{:else if ecoregion || phzZone || zipcode}
		<p class="mt-2 text-[11px] italic text-stone-600">No candidate plants found.</p>
	{/if}
</div>
