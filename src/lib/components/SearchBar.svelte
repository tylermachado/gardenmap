<script lang="ts">
	import Location from '$lib/icons/location.svg';
	import { getCityStateLabel, type NominatimAddress } from '$lib/types/layer.js';

	interface SearchBarProps {
		searchQuery: string;
		onSearch: () => void;
		onFindLocation: () => void;
		variant?: 'default' | 'splash';
		searchResultAddress?: NominatimAddress | null;
	}

	let { searchQuery = $bindable(''), onSearch, onFindLocation, variant = 'default', searchResultAddress = null }: SearchBarProps = $props();

	const isSplash = $derived(variant === 'splash');
	let showValidationError = $state(false);
	let editMode = $state(false);

	const cityStateLabel = $derived(getCityStateLabel(searchResultAddress));
	const showResult = $derived(!editMode && !!searchResultAddress);

	$effect(() => {
		if (searchResultAddress) {
			editMode = false;
		}
	});

	function hasZipcode(query: string): boolean {
		const zipRegex = /\b\d{5}(?:-\d{4})?\b/;
		return zipRegex.test(query);
	}

	const trimmedSearchQuery = $derived(searchQuery.trim());
	const hasSearchQuery = $derived(trimmedSearchQuery.length > 0);
	const isValidSearchQuery = $derived(!hasSearchQuery || hasZipcode(trimmedSearchQuery));
	const errorMessage = $derived(
		showValidationError && !isValidSearchQuery
			? 'Please include a valid US ZIP code in your search (5-digit, e.g. 12345)'
			: ''
	);

	function handleSearch() {
		if (!isValidSearchQuery) {
			showValidationError = true;
			return;
		}

		showValidationError = false;
		onSearch();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (showValidationError && searchQuery) {
			showValidationError = false;
		}

		if (e.key === 'Enter') handleSearch();
	}
</script>

<div class={isSplash ? 'w-full flex flex-col gap-2' : 'w-full flex flex-col relative'}>
	<div class={showResult ? 'flex flex-col md:flex-row md:items-stretch' : 'flex flex-row items-stretch'}>
		{#if !showResult}
			<!-- Location button -->
			<button
				class={isSplash
					? `cursor-pointer border rounded-l bg-transparent px-3 py-2 flex items-center justify-center shrink-0 hover:bg-stone-100 hover:text-lime-950 ${errorMessage ? 'border-red-400' : 'border-stone-300'}`
					: `cursor-pointer border-y border-l border-r-0 bg-stone-100 px-4 py-3 flex items-center justify-center shrink-0 hover:bg-lime-950 hover:text-stone-100 ${errorMessage ? 'border-red-500' : 'border-lime-950'}`}
				onclick={onFindLocation}
				aria-label="Find My Location"
				title="Use my location"
			>
				<img src={Location} alt="" class={isSplash ? 'h-5 w-5 invert' : 'h-5 w-5'} />
			</button>
		{/if}

		{#if showResult}
			<!-- Result summary -->
			<div
				class={isSplash
					? 'flex-1 min-w-0 border-y border-l border-r-0 rounded-l px-3 py-2 bg-white/10 text-stone-100 border-stone-300 flex flex-col items-start gap-0 md:flex-row md:items-center md:gap-2'
					: 'flex-1 min-w-0 border border-b-0 md:border-b md:border-r-0 px-3 py-2 bg-stone-100 border-lime-950 flex flex-col items-start gap-0 md:flex-row md:items-center md:gap-2'}
			>
				{#if searchResultAddress?.postcode}
					<div class={isSplash ? 'text-lg font-bold leading-tight shrink-0' : 'text-lg font-bold text-stone-800 leading-tight shrink-0'}>{searchResultAddress.postcode}</div>
				{/if}
				{#if searchResultAddress?.postcode && cityStateLabel}
					<div class={isSplash ? 'hidden md:block text-lg font-bold leading-tight text-stone-300' : 'hidden md:block text-lg font-bold leading-tight text-stone-400'}>•</div>
				{/if}
				{#if cityStateLabel}
					<div class={isSplash ? 'min-w-0 text-lg font-bold leading-tight break-words md:truncate' : 'min-w-0 text-lg font-bold text-stone-800 leading-tight break-words md:truncate'}>{cityStateLabel}</div>
				{/if}
			</div>

			<!-- Edit location button -->
			<button
				class={isSplash
					? 'rounded-r border bg-stone-100 px-4 py-2 text-lime-950 font-semibold shrink-0 hover:bg-lime-100 border-stone-300 flex items-center justify-center gap-1.5 md:justify-start'
					: 'border border-l md:border-l-0 bg-stone-100 px-5 py-3 text-lime-950 font-semibold shrink-0 hover:bg-lime-950 hover:text-stone-100 border-lime-950 flex items-center justify-center gap-1.5 md:justify-start'}
				onclick={() => (editMode = true)}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
				</svg>
				Edit Location
			</button>
		{:else}
			<!-- Zip code input -->
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Enter your zip code"
				class={isSplash
					? `flex-1 min-w-0 border-y border-x-0 px-3 py-2 focus:outline-none bg-white/10 text-stone-100 placeholder-stone-300 ${errorMessage ? 'border-red-400' : 'border-stone-300'}`
					: `flex-1 min-w-0 border-y border-x-0 px-3 py-3 focus:outline-none bg-stone-100 ${errorMessage ? 'border-red-500' : 'border-lime-950'}`}
				onkeydown={handleKeydown}
			/>

			<!-- Search button -->
			<button
				class={isSplash
					? `rounded-r border bg-stone-100 px-4 py-2 text-lime-950 font-semibold shrink-0 hover:bg-lime-100 ${errorMessage ? 'border-red-400' : 'border-stone-300'}`
					: `border-y border-r border-l-0 bg-stone-100 px-5 py-3 text-lime-950 font-semibold shrink-0 hover:bg-lime-950 hover:text-stone-100 ${errorMessage ? 'border-red-500' : 'border-lime-950'}`}
				onclick={handleSearch}
			>
				Search
			</button>
		{/if}
	</div>

	{#if errorMessage}
		<p class={isSplash ? 'text-red-300 text-sm' : 'absolute top-full left-0 right-0 text-red-600 text-xs bg-red-50 border border-red-300 px-3 py-1 z-10'}>{errorMessage}</p>
	{/if}
</div>
