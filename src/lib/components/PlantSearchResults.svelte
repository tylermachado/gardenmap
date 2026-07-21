<script lang="ts">
	import { onMount } from 'svelte';
	import PlantModal from '$lib/components/PlantModal.svelte';
	import type { PlantSearchResult, PlantSummary } from '$lib/types/plant.js';
	import { fetchPlantDetail } from '$lib/api/plants.js';
	import { page } from '$app/stores';

	const IMG_BASE_URL = 'https://d10s8hlfsm6n8p.cloudfront.net/images/';
	const PlantIcon1 = '/logos/plant.svg';

	interface PlantSearchResultsProps {
		results: PlantSearchResult[];
		term: string;
		loading?: boolean;
		error?: string | null;
		/** Whether a location is set; drives whether a verdict can be shown. */
		hasLocation?: boolean;
	}

	let { results, term, loading = false, error = null, hasLocation = false }: PlantSearchResultsProps = $props();

	let selectedPlant: PlantSummary | null = $state(null);

	// A shared link (?plant=<id>) reopens that plant's modal on load.
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
</script>

<div class="w-full items-start p-4 text-left">
	<h3 class="w-full items-start text-left">Plant Search</h3>
	{#if hasLocation}
		<p>Whether each match is appropriate for your current location</p>
	{:else}
		<p>Set a location to check whether these plants suit your area</p>
	{/if}

	{#if loading}
		<p class="mt-2 text-[11px] italic text-stone-600">Searching…</p>
	{:else if error}
		<p class="mt-2 text-[11px] italic text-red-600">{error}</p>
	{:else if results.length === 0}
		<p class="mt-2 text-[11px] italic text-stone-600">No plants found matching “{term}”.</p>
	{:else}
		<div class="grid w-full grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2 p-4">
			{#each results as plant (plant.id)}
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

					<!-- Suitability verdict -->
					{#if plant.appropriate === true}
						<span class="mt-0.5 rounded-full bg-lime-100 px-2 py-0.5 text-center text-[10px] font-semibold text-lime-900">
							✅ Appropriate for your area
						</span>
					{:else if plant.appropriate === false}
						<span class="mt-0.5 rounded-full bg-red-100 px-2 py-0.5 text-center text-[10px] font-semibold text-red-800">
							❌ Not recommended here
						</span>
					{:else}
						<span class="mt-0.5 rounded-full bg-stone-200 px-2 py-0.5 text-center text-[10px] font-medium text-stone-600">
							Set a location to check
						</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

{#if selectedPlant}
	<PlantModal plant={selectedPlant} onclose={() => (selectedPlant = null)} />
{/if}
