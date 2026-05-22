<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import InfoModal from '$lib/components/InfoModal.svelte';

	let { children } = $props();
	let mounted = $state(false);
	let showAbout = $state(false);
	let showHowTo = $state(false);

	onMount(() => {
		mounted = true;
	});
</script>

<InfoModal title="About" open={showAbout} onclose={() => (showAbout = false)}>
	{#snippet children()}
		<p>
			GardenersMap is a project of <a href="https://www.whiteflowerfarm.com/" target="_blank" rel="noopener">White Flower Farm</a> and the <a href="https://www.sustainablegardeninginstitute.org/" target="_blank" rel="noopener">Sustainable Gardening Institute</a>.
		</p>
		<p>
			It helps you discover native plants suited to your specific location — taking into
			account your EPA Level III ecoregion and USDA Plant Hardiness Zone.
		</p>
		<p>
			Native plants support local ecosystems, require less maintenance once established, and provide
			critical habitat for pollinators and wildlife.
		</p>
		<h3>Data sources</h3>
		<ul>
			<li><a href="https://www.epa.gov/eco-research/ecoregions" target="_blank" rel="noopener">EPA Ecoregions (Level III)</a></li>
			<li><a href="https://planthardiness.ars.usda.gov/" target="_blank" rel="noopener">USDA Plant Hardiness Zone Map (2023)</a></li>
		</ul>
	{/snippet}
</InfoModal>

<InfoModal title="How to Use" open={showHowTo} onclose={() => (showHowTo = false)}>
	{#snippet children()}
		<p>Getting started is easy:</p>
		<ol>
			<li><strong>Enter your zip code</strong> in the search bar on the home screen, or click <em>Use my location</em>.</li>
			<li>The map will zoom to your area and identify your <strong>ecoregion</strong> and <strong>hardiness zone</strong>.</li>
			<li>A list of <strong>native plant species</strong> suited to both your region and zone will appear on the right.</li>
			<li>Use the <strong>Filters</strong> to narrow plants by type, sun/shade, moisture needs, or the pollinators they support.</li>
			<li>Click any plant to see a detailed profile.</li>
		</ol>
		<p>
			You can also click anywhere on the map to look up plants for that location.
		</p>
	{/snippet}
</InfoModal>

<div class="h-screen bg-stone-300 flex flex-col overflow-hidden">
	<header class="bg-lime-950 p-4 flex items-center justify-between">
		<h1 class="font-serif text-3xl font-bold text-stone-100">GardenersMap</h1>
		<nav class="flex items-center gap-4">
			<button onclick={() => (showAbout = true)} class="text-stone-300 text-sm hover:text-stone-100 transition-colors">About</button>
			<button onclick={() => (showHowTo = true)} class="text-stone-300 text-sm hover:text-stone-100 transition-colors">How to Use</button>
		</nav>
	</header>
	
	<main class="flex-1 flex flex-col">
		{#if mounted}
			{@render children()}
		{:else}
			<div class="flex-1 flex items-center justify-center">
				<div class="text-stone-600">Loading...</div>
			</div>
		{/if}
	</main>
</div>

<style>
	:global(html, body) {
		height: 100%;
		margin: 0;
		padding: 0;
	}
</style>
