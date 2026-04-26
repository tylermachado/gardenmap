<script lang="ts">
	import CandidatePlants from '$lib/components/CandidatePlants.svelte';
	import type { NominatimAddress } from '$lib/types/layer.js';

	interface LocationInfoProps {
		searchResultAddress: NominatimAddress | null;
		pointLayerData: Record<string, Record<string, any>>;
	}

	let { searchResultAddress, pointLayerData }: LocationInfoProps = $props();

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

</script>

<div class="w-full items-start p-4 text-left">
	{#if searchResultAddress}
		<h3>{addressLabel}</h3>
	{/if}
	
	<!-- Insert polygon data results -->
	{#if Object.keys(pointLayerData).length > 0}
		<div class="mt-3 space-y-3">
			{#if pointLayerData.phz}
				<div class="rounded border border-stone-500 bg-stone-100 p-2">
					<h4 class="font-semibold text-xs tracking-wide">USDA 2023 Plant Hardiness Zone</h4>
					<ul class="mt-1 text-[11px] leading-tight space-y-1">
						{#if pointLayerData.phz.zone}
							<li class="font-mono"><span class="text-stone-700">USDA 2023 Plant Hardiness Zone</span>: {pointLayerData.phz.zone}</li>
						{/if}
						{#if pointLayerData.phz.trange}
							<li class="font-mono"><span class="text-stone-700">Average Annual Lowest Temperature</span>: {pointLayerData.phz.trange}°F</li>
						{/if}
						{#if pointLayerData.phz.zone}
							<li class="font-mono"><span class="text-stone-700"><a href="https://planthardiness.ars.usda.gov/" target="_blank" rel="noopener noreferrer" class="underline">More information about USDA Plant Hardiness Zones</a></span></li>
						{/if}
						
					</ul>
				</div>
			{/if}
			{#if pointLayerData.ecoregions}
				<div class="rounded border border-stone-500 bg-stone-100 p-2">
					<h4 class="font-semibold text-xs tracking-wide">North American Ecoregions - Level III</h4>
					{#if pointLayerData.ecoregions.NA_L3NAME}
						<ul class="mt-1 text-[11px] leading-tight space-y-1">
							<li class="font-mono"><span class="text-stone-700">Level 3</span>: {toTitleCase(pointLayerData.ecoregions.NA_L3NAME)}</li>
							<li class="font-mono"><span class="text-stone-700">Level 2</span>: {toTitleCase(pointLayerData.ecoregions.NA_L2NAME)}</li>
							<li class="font-mono"><span class="text-stone-700">Level 1</span>: {toTitleCase(pointLayerData.ecoregions.NA_L1NAME)}</li>
							<li class="font-mono"><span class="text-stone-700"><a href="https://sgi-gardenlibrary.maps.arcgis.com/sharing/rest/content/items/79bca4b771a04cb0b61176cf6f778565/data" target="_blank" rel="noopener noreferrer" class="underline">View detailed Ecoregion Descriptions</a></span></li>
						</ul>
					{/if}
				</div>
			{/if}
		</div>
	{:else if searchResultAddress}
		<p class="text-[11px] italic text-stone-600 mt-2">No polygon matches at this point.</p>
	{/if}
</div>

<CandidatePlants
	zipcode={searchResultAddress?.postcode}
/>
