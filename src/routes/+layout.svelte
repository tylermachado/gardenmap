<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import InfoModal from '$lib/components/InfoModal.svelte';

	const GA_MEASUREMENT_ID = 'G-2XBQGFE0ZJ';

	let { children } = $props();
	let mounted = $state(false);
	let showAbout = $state(false);

	onMount(() => {
		mounted = true;

		// Only load Google Analytics in production builds, not during `vite dev`.
		if (!dev) {
			const script = document.createElement('script');
			script.async = true;
			script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
			document.head.appendChild(script);

			window.dataLayer = window.dataLayer || [];
			function gtag(...args: unknown[]) {
				window.dataLayer.push(args);
			}
			gtag('js', new Date());
			gtag('config', GA_MEASUREMENT_ID);
		}
	});
</script>

<InfoModal title="About" open={showAbout} onclose={() => (showAbout = false)}>
	{#snippet children()}
		<p>
			MyNativePlantList.com is a collaboration between <a href="https://www.sustainablegardeninginstitute.org/" target="_blank" rel="noopener">The Sustainable Gardening Institute</a> and <a href="https://www.whiteflowerfarm.com/" target="_blank" rel="noopener">White Flower Farm</a>. It is designed to help users find plant species that are:
		</p>
		<ul>
			<li>Native to the user’s Level III Ecoregion.</li>
			<li>Generally considered winter hardy in the user’s Plant Hardiness Zone.</li>
			<li>Commercially available.</li>
		</ul>
		<p>
You can read more about Ecoregions and Hardiness Zones via the links below.
		</p>
		<h3>Data sources</h3>
		<ul>
			<li><a href="https://www.epa.gov/eco-research/ecoregions" target="_blank" rel="noopener">EPA Ecoregions (Level III)</a></li>
			<li><a href="https://planthardiness.ars.usda.gov/" target="_blank" rel="noopener">USDA Plant Hardiness Zone Map (2023)</a></li>
		</ul>
		<p>This site incorporates data and images from <a href="https://www.wildflower.org/" target="_blank" rel="noopener">Lady Bird Johnson Wildflower Center</a> and the <a href="https://highways.dot.gov/" target="_blank" rel="noopener">Federal Highway Administration</a>. For questions, comments, suggestions, etc. please email <a href="mailto:admin@mynativeplantlist.com">admin@mynativeplantlist.com</a>.</p>
	{/snippet}
</InfoModal>

<div class="h-screen bg-stone-300 flex flex-col overflow-hidden">
	<header class="bg-lime-950 p-4 flex items-center justify-between">
		<a href="/"><h1 class="font-serif text-xl sm:text-3xl font-bold text-stone-100">MyNativePlantList.com</h1></a>
		<nav class="flex items-center gap-4">
			<button onclick={() => (showAbout = true)} class="text-stone-300 text-sm hover:text-stone-100 transition-colors">About</button>
		</nav>
	</header>
	
	<main class="flex-1 flex flex-col overflow-hidden min-h-0">
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
