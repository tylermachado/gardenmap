<script lang="ts">
	import type { LayerOption, NominatimAddress } from '$lib/types/layer.js';
	import InfoModal from './InfoModal.svelte';

	interface LocationInfoProps {
		searchResultAddress: NominatimAddress | null;
		pointLayerData: Record<string, Record<string, any>>;
		layers: LayerOption[];
		onEditLocation?: () => void;
	}

	let { searchResultAddress, pointLayerData, layers, onEditLocation }: LocationInfoProps = $props();

	function toTitleCase(str: string): string {
		return str
			.toLowerCase()
			.split(/[\s_-]+/)
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	const cityStateLabel = $derived(
		[
			searchResultAddress?.suburb,
			searchResultAddress?.village,
			searchResultAddress?.town,
			searchResultAddress?.city,
			searchResultAddress?.state,
			searchResultAddress?.country
		]
			.filter(Boolean)
			.join(', ')
	);

	const phzLayer = $derived(layers.find(l => l.path === 'geodata/phz.json'));
	const ecoregionsLayer = $derived(layers.find(l => l.path === 'geodata/ecoregions.json'));

	let infoModalLayer: LayerOption | null = $state(null);
</script>

{#snippet infoButton(layer: LayerOption | undefined)}
	{#if layer}
		<button
			type="button"
			class="text-stone-500 hover:text-stone-800 flex-shrink-0"
			onclick={() => infoModalLayer = layer}
			aria-label={`About this data: ${layer.name}`}
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
		</button>
	{/if}
{/snippet}

<div class="w-full flex flex-col sm:flex-row text-left">

	<!-- Location column -->
	<div class="flex-1 min-w-0 p-4 flex flex-col gap-1">
		{#if searchResultAddress}
			{#if searchResultAddress.postcode}
				<div class="font-mono text-3xl font-bold text-stone-800">{searchResultAddress.postcode}</div>
				<div class="text-sm text-stone-600">{cityStateLabel}</div>
			{:else}
				<div class="text-xl font-bold text-stone-800">{cityStateLabel}</div>
			{/if}
			{#if onEditLocation}
				<button
					type="button"
					class="mt-3 self-start border border-lime-950 rounded bg-stone-100 px-3 py-1.5 text-sm text-lime-950 font-bold flex items-center gap-1.5 hover:bg-stone-50"
					onclick={onEditLocation}
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
					</svg>
					Edit Location
				</button>
			{/if}
		{/if}
	</div>

	{#if Object.keys(pointLayerData).length > 0}
		<!-- USDA Hardiness Zone column -->
		<div class="flex-1 min-w-0 p-4 flex flex-col gap-1 border-t sm:border-t-0 sm:border-l border-stone-400">
			{#if pointLayerData.phz}
				<h4 class="font-semibold text-base tracking-wide flex items-center gap-1">
					<a href="https://planthardiness.ars.usda.gov/" target="_blank" rel="noopener noreferrer" class="underline">USDA 2023 Plant Hardiness Zone</a>
					{@render infoButton(phzLayer)}
				</h4>
				{#if pointLayerData.phz.zone}
					<div class="font-mono text-3xl font-bold text-stone-800 mt-1">{pointLayerData.phz.zone}</div>
				{/if}
				{#if pointLayerData.phz.trange}
					<div class="mt-2">
						<div class="text-[10px] uppercase tracking-wide text-stone-500">Avg. Annual Lowest Temp</div>
						<div class="font-mono text-sm font-bold text-stone-800">{pointLayerData.phz.trange}°F</div>
					</div>
				{/if}
			{/if}
		</div>

		<!-- Ecoregion column -->
		<div class="flex-1 min-w-0 p-4 flex flex-col gap-1 border-t sm:border-t-0 sm:border-l border-stone-400">
			{#if pointLayerData.ecoregions}
				<h4 class="font-semibold text-base tracking-wide flex items-center gap-1">
					North American Ecoregions - Level III
					{@render infoButton(ecoregionsLayer)}
				</h4>
				{#if pointLayerData.ecoregions.NA_L3NAME}
					<div class="mt-1 flex flex-col gap-2">
						<div>
							<div class="text-[10px] uppercase tracking-wide text-stone-500">Level 1</div>
							<div class="font-mono text-sm font-bold text-stone-800">{pointLayerData.ecoregions.NA_L1CODE} {toTitleCase(pointLayerData.ecoregions.NA_L1NAME)}</div>
						</div>
						<div>
							<div class="text-[10px] uppercase tracking-wide text-stone-500">Level 2</div>
							<div class="font-mono text-sm font-bold text-stone-800">{pointLayerData.ecoregions.NA_L2CODE} {toTitleCase(pointLayerData.ecoregions.NA_L2NAME)}</div>
						</div>
						<div>
							<div class="text-[10px] uppercase tracking-wide text-stone-500">Level 3</div>
							<div class="font-mono text-sm font-bold text-stone-800">{pointLayerData.ecoregions.NA_L3CODE} {toTitleCase(pointLayerData.ecoregions.NA_L3NAME)}</div>
						</div>
					</div>
					<a href="https://sgi-gardenlibrary.maps.arcgis.com/sharing/rest/content/items/79bca4b771a04cb0b61176cf6f778565/data" target="_blank" rel="noopener noreferrer" class="text-[11px] mt-2">View detailed Ecoregion Descriptions →</a>
				{/if}
			{/if}
		</div>
	{:else if searchResultAddress}
		<div class="flex-1 min-w-0 p-4 flex items-center border-t sm:border-t-0 sm:border-l border-stone-400">
			<p class="text-[11px] italic text-stone-600">No polygon matches at this point.</p>
		</div>
	{/if}

</div>

<InfoModal
	title={infoModalLayer?.name ?? ''}
	open={infoModalLayer !== null}
	onclose={() => infoModalLayer = null}
>
	{#snippet children()}
		<p>{infoModalLayer?.description}</p>
	{/snippet}
</InfoModal>
