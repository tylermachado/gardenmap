<script lang="ts">
	import Location from '$lib/icons/location.svg';

	interface SearchBarProps {
		searchQuery: string;
		onSearch: () => void;
		onFindLocation: () => void;
	}

	let { searchQuery = $bindable(), onSearch, onFindLocation }: SearchBarProps = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') onSearch();
	}
</script>

<div class="mt-4 w-full flex flex-row gap-2 px-6 items-center">
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
			placeholder="Search for a location..."
			class="flex-1 rounded-l border border-lime-950 border-r-0 px-3 py-2 focus:outline-none"
			onkeydown={handleKeydown}
		/>
		<button
			class="rounded-r border border-lime-950 border-l-0 bg-stone-100 px-4 py-2 text-lime-950 hover:bg-lime-950 hover:text-stone-100"
			onclick={onSearch}
		>
			Search
		</button>
	</div>
</div>
