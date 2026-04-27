<script lang="ts">
	import PlantIcon1 from '$lib/icons/noun-plant-6741.svg';

	export interface Plant {
		id: string;
		name: string;
		scientific_name?: string;
		common_name: Array<string>;
		plant_type?: Array<string>;
		sun_and_shade?: Array<string>;
		moisture_use?: string;
		image_url?: string;
	}

	interface PlantModalProps {
		plant: Plant;
		onclose: () => void;
	}

	let { plant, onclose }: PlantModalProps = $props();
</script>

<div
	role="presentation"
	class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
	onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
>
	<div
		role="dialog"
		aria-modal="true"
		aria-label={plant.scientific_name}
		tabindex="-1"
		class="relative w-96 max-w-[90vw] rounded-xl bg-white p-6 shadow-2xl"
	>
		<button
			type="button"
			class="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-800"
			onclick={onclose}
			aria-label="Close"
		>
			&times;
		</button>

		<img
			src={plant.image_url ?? PlantIcon1}
			alt={plant.scientific_name}
			class="mx-auto mb-4 h-40 w-40 object-contain"
		/>

		<p class="text-center text-base font-semibold leading-snug text-stone-800">
			{plant.scientific_name}
		</p>
		<p class="mt-1 text-center text-sm italic text-stone-500">
			{plant.common_name.join(', ')}
		</p>

		<!-- More detail sections go here -->
	</div>
</div>
