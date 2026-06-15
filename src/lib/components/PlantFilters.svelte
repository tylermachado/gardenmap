<script lang="ts">
	import {
		PLANT_TYPE_OPTIONS,
		SUN_SHADE_OPTIONS,
		MOISTURE_OPTIONS,
		POLLINATOR_KEYS,
		type PlantFilterState,
	} from '$lib/plant-filters.js';

	interface PlantFiltersProps {
		filters: PlantFilterState;
		/** 'panel' = light results panel, 'splash' = dark splash overlay. */
		variant?: 'panel' | 'splash';
	}

	let { filters, variant = 'panel' }: PlantFiltersProps = $props();

	const isSplash = $derived(variant === 'splash');
	let showAttractsDropdown = $state(false);

	const labelClass = $derived(
		isSplash ? 'flex flex-col gap-1 text-[11px] text-stone-200' : 'flex flex-col gap-1 text-[11px] text-stone-600'
	);
	const selectClass = $derived(
		isSplash
			? 'rounded border border-stone-400 bg-white/10 px-2 py-1 text-[12px] text-stone-100'
			: 'rounded border border-stone-400 bg-white px-2 py-1 text-[12px]'
	);
</script>

<div class="flex flex-wrap items-end gap-3">
	<label class={labelClass}>
		Plant type
		<select bind:value={filters.plantType} class={selectClass}>
			<option value="" class="text-stone-900">All</option>
			{#each PLANT_TYPE_OPTIONS as opt}
				<option value={opt} class="text-stone-900">{opt}</option>
			{/each}
		</select>
	</label>

	<label class={labelClass}>
		Sun / shade
		<select bind:value={filters.sunShade} class={selectClass}>
			<option value="" class="text-stone-900">All</option>
			{#each SUN_SHADE_OPTIONS as opt}
				<option value={opt} class="text-stone-900">{opt}</option>
			{/each}
		</select>
	</label>

	<label class={labelClass}>
		Moisture
		<select bind:value={filters.moisture} class={selectClass}>
			<option value="" class="text-stone-900">All</option>
			{#each MOISTURE_OPTIONS as opt}
				<option value={opt} class="text-stone-900">{opt}</option>
			{/each}
		</select>
	</label>

	<!-- Attracts: custom multi-select dropdown -->
	<div class="{labelClass} relative">
		Attracts
		<button
			class="flex items-center gap-1 rounded border px-2 py-1 text-[12px] text-left
				{filters.pollinators.size > 0
					? 'border-lime-700 bg-lime-50 text-lime-900 font-medium'
					: isSplash
						? 'border-stone-400 bg-white/10 text-stone-100'
						: 'border-stone-400 bg-white text-stone-700'}"
			onclick={() => (showAttractsDropdown = !showAttractsDropdown)}
			aria-expanded={showAttractsDropdown}
		>
			{filters.pollinators.size > 0 ? `${filters.pollinators.size} selected` : 'Any'}
			<svg class="w-3 h-3 ml-auto transition-transform {showAttractsDropdown ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>

		{#if showAttractsDropdown}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="absolute top-full left-0 z-20 mt-1 w-52 rounded border border-stone-300 bg-white text-stone-700 shadow-lg"
				onmouseleave={() => (showAttractsDropdown = false)}
			>
				<div class="max-h-64 overflow-y-auto p-2 flex flex-col gap-1">
					{#each POLLINATOR_KEYS as { key, label }}
						<label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[12px] hover:bg-stone-100">
							<input
								type="checkbox"
								checked={filters.pollinators.has(key)}
								onchange={(e) => {
									const next = new Set(filters.pollinators);
									if ((e.target as HTMLInputElement).checked) next.add(key);
									else next.delete(key);
									filters.pollinators = next;
								}}
							/>
							{label}
						</label>
					{/each}
				</div>
				{#if filters.pollinators.size > 0}
					<div class="border-t border-stone-200 px-3 py-1.5">
						<button class="text-[11px] text-stone-500 underline hover:text-stone-700" onclick={() => (filters.pollinators = new Set())}>
							Clear
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
