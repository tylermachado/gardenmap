<script lang="ts">
	import PlantModal from '$lib/components/PlantModal.svelte';
	import { savedPlants } from '$lib/stores/savedPlants.svelte.js';
	import type { PlantSummary } from '$lib/types/plant.js';

	const IMG_BASE_URL = 'https://d10s8hlfsm6n8p.cloudfront.net/images/';
	const PlantIcon1 = '/logos/plant.svg';

	let open = $state(false);
	let selectedPlant: PlantSummary | null = $state(null);

	const count = $derived(savedPlants.plants.length);

	// Close the panel automatically if the list empties out (e.g. last plant removed).
	$effect(() => {
		if (count === 0) open = false;
	});
</script>

{#if count > 0}
	<div class="fixed bottom-0 right-4 z-[1200] flex flex-col items-end">
		{#if open}
			<div
				role="dialog"
				aria-label="My Saved Plants"
				class="mb-0 flex max-h-[70vh] w-80 max-w-[88vw] flex-col overflow-hidden rounded-t-lg border border-b-0 border-stone-300 bg-white shadow-2xl"
			>
				<div class="flex shrink-0 items-center justify-between border-b border-stone-200 px-4 py-3">
					<h2 class="text-sm font-semibold text-stone-900">My Saved Plants ({count})</h2>
					<button
						type="button"
						class="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
						onclick={() => (open = false)}
						aria-label="Close"
					>
						&times;
					</button>
				</div>
				<div class="grid grid-cols-3 gap-2 overflow-y-auto p-3">
					{#each savedPlants.plants as plant (plant.id)}
						<div class="group relative flex flex-col items-center gap-1 rounded p-1">
							<button type="button" class="w-full" onclick={() => (selectedPlant = plant)}>
								<div
									class="w-full"
									style="aspect-ratio: 4/5; overflow: hidden; border-radius: 0.25rem;"
								>
									<img
										src={plant.images?.length
											? `${IMG_BASE_URL}${plant.images[0].img_file_name}`
											: (plant.image_url ?? PlantIcon1)}
										alt={plant.scientific_name}
										class="h-full w-full {plant.images?.length || plant.image_url ? 'object-cover' : 'object-contain p-2'}"
										loading="lazy"
									/>
								</div>
								<span class="mt-1 block text-center text-[10px] leading-tight">
									{plant.scientific_name ?? plant.name}
								</span>
							</button>
							<button
								type="button"
								class="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-stone-500 opacity-0 shadow hover:text-red-600 group-hover:opacity-100"
								onclick={() => savedPlants.remove(plant.id)}
								aria-label="Remove {plant.scientific_name ?? plant.name} from My Saved Plants"
							>
								&times;
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<button
			type="button"
			class="flex items-center gap-2 rounded-t-lg border border-b-0 border-lime-950 bg-lime-950 px-4 py-2 text-sm font-semibold text-stone-100 shadow-lg hover:bg-lime-900"
			onclick={() => (open = !open)}
			aria-expanded={open}
		>
			<svg class="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
				<path
					d="M12 21s-6.716-4.35-9.428-8.223C.686 10.25 1.03 6.9 3.343 5.06c2.02-1.61 4.774-1.24 6.2.6L12 8.4l2.457-2.74c1.426-1.84 4.18-2.21 6.2-.6 2.313 1.84 2.657 5.19.771 7.717C18.716 16.65 12 21 12 21z"
				/>
			</svg>
			My Saved Plants
			<span class="rounded-full bg-lime-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
				{count}
			</span>
		</button>
	</div>
{/if}

{#if selectedPlant}
	<PlantModal plant={selectedPlant} onclose={() => (selectedPlant = null)} />
{/if}
