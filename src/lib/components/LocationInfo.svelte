<script lang="ts">
	import PlantIcon1 from '$lib/icons/noun-plant-6741.svg';

	interface LocationInfoProps {
		searchResultAddress: any;
		pointLayerData: Record<string, Record<string, any>>;
		numFlowers: number;
	}

	let { searchResultAddress, pointLayerData, numFlowers }: LocationInfoProps = $props();

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
			searchResultAddress?.town,
			searchResultAddress?.city,
			searchResultAddress?.state
		]
			.filter(Boolean)
			.join(', ')
	);

	const flowerSlots = $derived(
		Array.from({ length: Math.max(3, Math.min(12, numFlowers)) }, (_, i) => i)
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
					<ul class="mt-1 text-[11px] leading-tight">
						{#if pointLayerData.phz.zone}
							<li class="font-mono"><span class="text-stone-700">Hardiness Zone</span>: {pointLayerData.phz.zone}</li>
						{/if}
						{#if pointLayerData.phz.trange}
							<li class="font-mono"><span class="text-stone-700">Temperature Range</span>: {pointLayerData.phz.trange}°F</li>
						{/if}
					</ul>
				</div>
			{/if}
			{#if pointLayerData.ecoregions}
				<div class="rounded border border-stone-500 bg-stone-100 p-2">
					<h4 class="font-semibold text-xs tracking-wide">North American Ecoregions - Level III</h4>
					{#if pointLayerData.ecoregions.NA_L3NAME}
						<p class="mt-1 text-[11px] leading-tight font-mono"><span class="text-stone-700">Level 3</span>: {toTitleCase(pointLayerData.ecoregions.NA_L3NAME)}</p>
						<p class="mt-1 text-[11px] leading-tight font-mono"><span class="text-stone-700">Level 2</span>: {toTitleCase(pointLayerData.ecoregions.NA_L2NAME)}</p>
						<p class="mt-1 text-[11px] leading-tight font-mono"><span class="text-stone-700">Level 1</span>: {toTitleCase(pointLayerData.ecoregions.NA_L1NAME)}</p>
						<p class="mt-1 text-[11px] leading-tight"><span class="font-mono text-stone-700"><a href="https://sgi-gardenlibrary.maps.arcgis.com/sharing/rest/content/items/79bca4b771a04cb0b61176cf6f778565/data" target="_blank" rel="noopener noreferrer" class="underline">View detailed Ecoregion Descriptions</a></span></p>
					{/if}
				</div>
			{/if}
		</div>
	{:else if searchResultAddress}
		<p class="text-[11px] italic text-stone-600 mt-2">No polygon matches at this point.</p>
	{/if}
</div>

<div class="w-full items-start p-4 text-left">
	<h3 class="w-full items-start text-left">Plants That Thrive Here</h3>
	<div class="grid w-full grid-cols-4 gap-2 p-4">
		{#each flowerSlots as _}
			<div class="flex aspect-square items-center justify-center">
				<span class="text-2xl">
					<img src={PlantIcon1} alt="Plant" class="h-xl w-xl text-blue-500" />
				</span>
			</div>
		{/each}
	</div>
</div>
