<script lang="ts">
	import Location from '$lib/icons/location.svg';

	interface SearchBarProps {
		searchQuery: string;
		onSearch: () => void;
		onFindLocation: () => void;
	}

	let { searchQuery = $bindable(''), onSearch, onFindLocation }: SearchBarProps = $props();
	let showValidationError = $state(false);

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
			searchQuery = '';
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

<div class="mt-4 w-full flex flex-col gap-2 px-6">
	<div class="flex flex-row gap-2 items-center">
		<button
			class="cursor-pointer border border-lime-950 rounded bg-stone-100 px-4 py-2 text-lime-950 hover:bg-lime-950 hover:text-stone-100 whitespace-nowrap flex items-center justify-center sm:w-auto w-12 h-12"
			onclick={onFindLocation}
			aria-label="Find My Location"
		>
			<img src={Location} alt="Find My Location" class="h-s w-s" />
		</button>
		
		<div class="flex w-full mt-2 sm:mt-0">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Enter your zip code"
				class="flex-1 rounded-l border border-r-0 px-3 py-2 focus:outline-none {errorMessage ? 'border-red-500' : 'border-lime-950'}"
				onkeydown={handleKeydown}
			/>
			<button
				class="rounded-r border border-l-0 bg-stone-100 px-4 py-2 text-lime-950 hover:bg-lime-950 hover:text-stone-100 {errorMessage ? 'border-red-500' : 'border-lime-950'}"
				onclick={handleSearch}
			>
				Search
			</button>
		</div>
	</div>
	
	{#if errorMessage}
		<p class="text-red-600 text-sm">{errorMessage}</p>
	{/if}
</div>
