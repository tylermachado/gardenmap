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
			My Native Plant List is a collaboration between <a
				href="https://www.sustainablegardeninginstitute.org/"
				target="_blank"
				rel="noopener">The Sustainable Gardening Institute</a
			>
			and
			<a href="https://www.whiteflowerfarm.com/" target="_blank" rel="noopener">White Flower Farm</a
			>. It is designed to help users find plant species that are:
		</p>
		<ul>
			<li>Native to the user’s Level III Ecoregion.</li>
			<li>Generally considered winter hardy in the user’s Plant Hardiness Zone.</li>
			<li>Commercially available.</li>
		</ul>
		<p>You can read more about Ecoregions and Hardiness Zones via the links below.</p>
		<h3>Data sources</h3>
		<ul>
			<li>
				<a href="https://www.epa.gov/eco-research/ecoregions" target="_blank" rel="noopener"
					>EPA Ecoregions (Level III)</a
				>
			</li>
			<li>
				<a href="https://planthardiness.ars.usda.gov/" target="_blank" rel="noopener"
					>USDA Plant Hardiness Zone Map (2023)</a
				>
			</li>
		</ul>
		<p>
			This site incorporates data and images from <a
				href="https://www.wildflower.org/"
				target="_blank"
				rel="noopener">Lady Bird Johnson Wildflower Center</a
			>
			and the
			<a href="https://highways.dot.gov/" target="_blank" rel="noopener"
				>Federal Highway Administration</a
			>.
		</p>
		<p class="text-sm">
			Additional data was compiled from these publicly available sources: Arizona Sonora Desert,
			California Native Plant Society Calscape, Denver Botanic Garden, Institute For Regional
			Conservation, Missouri Botanical Garden, Native Plant Trust, North Carolina State Extension,
			Oregon State University, Plant Delights Nursery, Texas A&amp;M Agrilife Extension, Top
			Tropicals Plant Encyclopedia, UCCE El Dorado County Master Gardeners, University of Florida
			IFAS Extension, USDA NRCS Plants Database, Utah State University Extension, and Washington
			Native Plant Society.
		</p>
		<p class="text-sm">
			For questions, comments, suggestions, etc. please email <a
				href="mailto:admin@mynativeplantlist.com">admin@mynativeplantlist.com</a
			>.
		</p>
	{/snippet}
</InfoModal>

<div class="flex h-screen flex-col overflow-hidden bg-stone-300">
	<header class="flex items-center justify-between bg-lime-950 p-4">
		<a href="/" class="flex items-center gap-3">
			<h1 class="font-serif text-xl font-bold text-stone-100 sm:text-3xl">My Native Plant List</h1>
			<span
				role="img"
				aria-label="The Sustainable Gardening Institute"
				class="inline-block h-8 bg-stone-100 sm:h-10"
				style="aspect-ratio: 163.7 / 88; mask: url(/logos/sgi.svg) center / contain no-repeat; -webkit-mask: url(/logos/sgi.svg) center / contain no-repeat;"
			></span>
			<span
				role="img"
				aria-label="White Flower Farm"
				class="inline-block h-8 bg-stone-100 sm:h-10"
				style="aspect-ratio: 811.7 / 724.5; mask: url(/logos/wff.svg) center / contain no-repeat; -webkit-mask: url(/logos/wff.svg) center / contain no-repeat;"
			></span>
		</a>
		<nav class="flex items-center gap-4">
			<button
				onclick={() => (showAbout = true)}
				class="text-sm text-stone-300 transition-colors hover:text-stone-100">About</button
			>
		</nav>
	</header>

	<main class="flex min-h-0 flex-1 flex-col overflow-hidden">
		{#if mounted}
			{@render children()}
		{:else}
			<div class="flex flex-1 items-center justify-center">
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
