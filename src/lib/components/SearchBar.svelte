<script lang="ts">
	import Location from '$lib/icons/location.svg';

	interface SearchBarProps {
		searchQuery: string;
		onSearch: () => void;
		onFindLocation: () => void;
	}

	let { searchQuery = $bindable(), onSearch, onFindLocation }: SearchBarProps = $props();
	let errorMessage = $state('');
	let hasError = $state(false);

	function hasZipcode(query: string): boolean {
		const zipRegex = /\b\d{5}(?:-\d{4})?\b/;
		return zipRegex.test(query);
	}

	function handleSearch() {
		if (searchQuery && !hasZipcode(searchQuery)) {
			errorMessage = 'Please include a valid US ZIP code in your search (5-digit, e.g. 12345)';
			hasError = true;
			searchQuery = ''; // Clear the search
			return;
		}
		// Clear error state if search is valid
		errorMessage = '';
		hasError = false;
		onSearch();
	}

	// Clear error state when user starts typing a valid zipcode
	$effect(() => {
		if (searchQuery && hasZipcode(searchQuery) && hasError) {
			errorMessage = '';
			hasError = false;
		}
	});

	function handleKeydown(e: KeyboardEvent) {
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
				placeholder="Search for a location with ZIP code..."
				class="flex-1 rounded-l border border-r-0 px-3 py-2 focus:outline-none {hasError ? 'border-red-500' : 'border-lime-950'}"
				onkeydown={handleKeydown}
			/>
			<button
				class="rounded-r border border-l-0 bg-stone-100 px-4 py-2 text-lime-950 hover:bg-lime-950 hover:text-stone-100 {hasError ? 'border-red-500' : 'border-lime-950'}"
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
