<script lang="ts">
	import Location from '$lib/icons/location.svg';

	interface SearchBarProps {
		searchQuery: string;
		onSearch: () => void;
		onFindLocation: () => void;
		variant?: 'default' | 'splash';
	}

	let { searchQuery = $bindable(''), onSearch, onFindLocation, variant = 'default' }: SearchBarProps = $props();

	const isSplash = $derived(variant === 'splash');
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

<div class={isSplash ? 'w-full flex flex-col gap-2' : 'w-full flex flex-col relative'}>
	<div class="flex flex-row items-stretch">
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
	</div>
	
	{#if errorMessage}
		<p class={isSplash ? 'text-red-300 text-sm' : 'absolute top-full left-0 right-0 text-red-600 text-xs bg-red-50 border border-red-300 px-3 py-1 z-10'}>{errorMessage}</p>
	{/if}
</div>
