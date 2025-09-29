<script lang="ts">
	import PlantIcon1 from '$lib/icons/noun-plant-6741.svg';

	interface LocationInfoProps {
		searchResultAddress: any;
		pointLayerData: Record<string, Record<string, any>>;
		numFlowers: number;
	}

	let { searchResultAddress, pointLayerData, numFlowers }: LocationInfoProps = $props();
</script>

<div class="w-full items-start p-4 text-left">
	{#if searchResultAddress}
		<h3>
			{[
				searchResultAddress.suburb,
				searchResultAddress.city,
				searchResultAddress.state
			].filter(Boolean).join(', ')}
		</h3>
	{/if}
	
	<!-- Insert polygon data results -->
	{#if Object.keys(pointLayerData).length > 0}
		<div class="mt-3 space-y-3">
			{#if pointLayerData.phz}
				<div class="rounded border border-stone-500 bg-stone-100 p-2">
					<h4 class="font-semibold text-xs tracking-wide">Plant Hardiness Zone</h4>
					<ul class="mt-1 text-[11px] leading-tight">
						{#if pointLayerData.phz.zone}
							<li><span class="font-mono text-stone-700">zone</span>: {pointLayerData.phz.zone}</li>
						{/if}
						{#if pointLayerData.phz.trange}
							<li><span class="font-mono text-stone-700">trange</span>: {pointLayerData.phz.trange}</li>
						{/if}
					</ul>
				</div>
			{/if}
			{#if pointLayerData.ecoregions}
				<div class="rounded border border-stone-500 bg-stone-100 p-2">
					<h4 class="font-semibold text-xs tracking-wide">Ecoregions</h4>
					{#if pointLayerData.ecoregions.US_L3NAME}
						<p class="mt-1 text-[11px] leading-tight"><span class="font-mono text-stone-700">Layer III</span>: {pointLayerData.ecoregions.US_L3NAME}</p>
						<p class="mt-1 text-[11px] leading-tight"><span class="font-mono text-stone-700">Layer II</span>: {pointLayerData.ecoregions.NA_L2NAME}</p>
						<p class="mt-1 text-[11px] leading-tight"><span class="font-mono text-stone-700">Layer I</span>: {pointLayerData.ecoregions.NA_L1NAME}</p>
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
		{#each Array(Math.max(3, Math.min(12, numFlowers))) as _, i}
			<div class="flex aspect-square items-center justify-center">
				<span class="text-2xl">
					<img src={PlantIcon1} alt="Plant" class="h-xl w-xl text-blue-500" />
				</span>
			</div>
		{/each}
	</div>
</div>
