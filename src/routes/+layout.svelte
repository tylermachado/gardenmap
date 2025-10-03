<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';

	let { children } = $props();
	let mounted = $state(false);
	
	onMount(() => {
		mounted = true;
	});
</script>

<div class="min-h-screen bg-stone-300 flex flex-col">
	<header class="bg-lime-950 p-4">
		<h1 class="font-serif text-3xl font-bold text-stone-100">GardenersMap</h1>
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
