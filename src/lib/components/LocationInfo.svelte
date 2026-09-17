<script lang="ts">
	import type { LayerOption, LocationAddress, ZipEnvironment } from '$lib/types/layer.js';
	import { getCityStateLabel } from '$lib/types/layer.js';
	import { resolveEcoregionLevels } from '$lib/ecoregions.js';
	import { zoneTempRange } from '$lib/hardiness.js';
	import InfoModal from './InfoModal.svelte';

	interface LocationInfoProps {
		searchResultAddress: LocationAddress | null;
		/** Ecoregion + zone from the ZIP endpoint; null is the error state. */
		environment: ZipEnvironment | null;
		layers: LayerOption[];
		onEditLocation?: () => void;
	}

	let { searchResultAddress, environment, layers, onEditLocation }: LocationInfoProps = $props();

	function toTitleCase(str: string): string {
		return str
			.toLowerCase()
			.split(/[\s_-]+/)
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	const cityStateLabel = $derived(getCityStateLabel(searchResultAddress));

	const phzLayer = $derived(layers.find(l => l.path === 'geodata/phz.json'));
	const ecoregionsLayer = $derived(layers.find(l => l.path === 'geodata/ecoregions.json'));

	// Level I/II labels for the code the endpoint returned. The endpoint gives only
	// Level III, so the wider levels come from the bundled layer's names.
	const ecoregion = $derived(
		resolveEcoregionLevels(environment?.ecoregionCode, environment?.ecoregionName)
	);
	const tempRange = $derived(
		environment ? zoneTempRange(environment.hardinessZone) : null
	);

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
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
		</button>
	{/if}
{/snippet}

<div class="w-full h-full flex flex-col sm:flex-row text-left">


	{#if environment}
		<!-- USDA Hardiness Zone column -->
		<div class="flex-1 min-w-0 p-4 flex flex-col gap-1 border-t sm:border-t-0 sm:border-l border-stone-400">
			<h2 class="font-semibold text-base tracking-wide leading-tight flex items-center gap-1">
				USDA 2023 Plant Hardiness Zone
				{@render infoButton(phzLayer)}
			</h2>
			<div class="font-mono text-3xl font-bold leading-none text-stone-800 mt-1">{environment.hardinessZone}{environment.hardinessSubzone}</div>
			{#if tempRange}
				<div class="mt-2">
					<div class="text-[10px] uppercase tracking-wide leading-tight text-stone-500">Avg. Annual Lowest Temp</div>
					<div class="font-mono text-sm font-bold leading-tight text-stone-800">{tempRange}°F</div>
				</div>
			{/if}
			<a href="https://planthardiness.ars.usda.gov/" target="_blank" rel="noopener noreferrer" class="text-[11px] mt-2">About Hardiness Zones →</a>
		</div>

		<!-- Ecoregion column -->
		<div class="flex-1 min-w-0 p-4 flex flex-col gap-1 border-t sm:border-t-0 sm:border-l border-stone-400">
			{#if ecoregion}
				<h2 class="font-semibold text-base tracking-wide leading-tight flex items-center gap-1">
					North American Ecoregions - Level III
					{@render infoButton(ecoregionsLayer)}
				</h2>
				<div class="mt-1 flex flex-col gap-2">
					<div class="hidden sm:block">
						<div class="text-[10px] uppercase tracking-wide leading-tight text-stone-500">Level 1</div>
						<div class="font-mono text-sm font-bold leading-tight text-stone-800">{ecoregion.l1Code} {toTitleCase(ecoregion.l1Name)}</div>
					</div>
					<div class="hidden sm:block">
						<div class="text-[10px] uppercase tracking-wide leading-tight text-stone-500">Level 2</div>
						<div class="font-mono text-sm font-bold leading-tight text-stone-800">{ecoregion.l2Code} {toTitleCase(ecoregion.l2Name)}</div>
					</div>
					<div>
						<div class="text-[10px] uppercase tracking-wide leading-tight text-stone-500">Level 3</div>
						<div class="font-mono text-sm font-bold leading-tight text-stone-800">{ecoregion.l3Code} {toTitleCase(ecoregion.l3Name)}</div>
					</div>
				</div>
				<a href="https://sgi-gardenlibrary.maps.arcgis.com/sharing/rest/content/items/79bca4b771a04cb0b61176cf6f778565/data" target="_blank" rel="noopener noreferrer" class="text-[11px] mt-2">View detailed Ecoregion Descriptions →</a>
			{/if}
		</div>
	{:else if searchResultAddress}
		<!-- The endpoint resolves ecoregion, zone and state for every recognised ZIP, so
		     reaching here means it returned an incomplete record. Say so rather than
		     showing plants matched on a partial location. -->
		<div class="flex-1 min-w-0 p-4 flex flex-col justify-center gap-1 border-t sm:border-t-0 sm:border-l border-stone-400">
			<p class="text-sm font-semibold text-stone-800">
				Location data unavailable{searchResultAddress.postcode ? ` for ${searchResultAddress.postcode}` : ''}.
			</p>
			<p class="text-[11px] italic text-stone-600">
				We couldn't resolve the hardiness zone and ecoregion for this location, so we can't
				list plants for it. Try a nearby ZIP code.
			</p>
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
