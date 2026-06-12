<script lang="ts">
	import type { LayerOption, NominatimAddress } from '$lib/types/layer.js';
	import InfoModal from './InfoModal.svelte';

	interface LocationInfoProps {
		searchResultAddress: NominatimAddress | null;
		pointLayerData: Record<string, Record<string, any>>;
		layers: LayerOption[];
	}

	let { searchResultAddress, pointLayerData, layers }: LocationInfoProps = $props();

	function toTitleCase(str: string): string {
		return str
			.toLowerCase()
			.split(/[\s_-]+/)
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	const addressLabel = $derived(
		[
			searchResultAddress?.suburb,
			searchResultAddress?.village,
			searchResultAddress?.town,
			searchResultAddress?.city,
			searchResultAddress?.state,
			searchResultAddress?.postcode
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

<div class="w-full items-start p-4 text-left flex flex-col gap-3">
	{#if searchResultAddress}
		<h3>{addressLabel}</h3>
	{/if}

	<!-- Insert polygon data results -->
	{#if Object.keys(pointLayerData).length > 0}
		<div class="flex flex-col lg:flex-row gap-3">
			<!-- Zone column -->
			<div class="">
				{#if pointLayerData.phz}
							<h4 class="font-semibold text-lg tracking-wide">
								<a href="https://planthardiness.ars.usda.gov/" target="_blank" rel="noopener noreferrer" class="underline">USDA 2023 Plant Hardiness Zone</a>
								{@render infoButton(phzLayer)}
							</h4>
							{#if pointLayerData.phz.zone}
								<div class="font-mono text-sm font-bold text-stone-800">Zone:</div>
								<div class="font-mono text-2xl font-bold text-stone-800 mb-[20px]">{pointLayerData.phz.zone}</div>
							{/if}
							{#if pointLayerData.phz.trange}
								<div class="font-mono text-sm font-bold text-stone-800">Average Annual Lowest Temperature:</div>
								<div class="font-mono text-2xl font-bold text-stone-800 mb-[20px]">{pointLayerData.phz.trange}°F</div>
							{/if}
				{/if}


				{#if pointLayerData.ecoregions}
							<h4 class="font-semibold text-lg tracking-wide">
								North American Ecoregions - Level III
								{@render infoButton(ecoregionsLayer)}
							</h4>
							{#if pointLayerData.ecoregions.NA_L3NAME}
								<div class="font-mono text-sm font-bold text-stone-800">Level 1:</div>
								<div class="font-mono text-2xl font-bold text-stone-800 mb-[20px]">{pointLayerData.ecoregions.NA_L1CODE} {toTitleCase(pointLayerData.ecoregions.NA_L1NAME)}</div>
								<div class="font-mono text-sm font-bold text-stone-800">Level 2:</div>
								<div class="font-mono text-2xl font-bold text-stone-800 mb-[20px]">{pointLayerData.ecoregions.NA_L2CODE} {toTitleCase(pointLayerData.ecoregions.NA_L2NAME)}</div>
								<div class="font-mono text-sm font-bold text-stone-800">Level 3:</div>
								<div class="font-mono text-2xl font-bold text-stone-800 mb-[20px]">{pointLayerData.ecoregions.NA_L3CODE} {toTitleCase(pointLayerData.ecoregions.NA_L3NAME)}</div>
								<div class="text-[11px] mt-1"><a href="https://sgi-gardenlibrary.maps.arcgis.com/sharing/rest/content/items/79bca4b771a04cb0b61176cf6f778565/data" target="_blank" rel="noopener noreferrer" class="underline">View detailed Ecoregion Descriptions</a></div>
							{/if}
				{/if}

			</div>
		</div>
	{:else if searchResultAddress}
		<p class="text-[11px] italic text-stone-600">No polygon matches at this point.</p>
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

