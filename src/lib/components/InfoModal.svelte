<script lang="ts">
	import type { Snippet } from 'svelte';

	interface InfoModalProps {
		title: string;
		open: boolean;
		onclose: () => void;
		children: Snippet;
	}

	let { title, open, onclose, children }: InfoModalProps = $props();

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby="info-modal-title"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		<div class="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-lg bg-white shadow-xl">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-stone-200 px-6 py-4">
				<h2 id="info-modal-title" class="text-lg font-semibold text-stone-900">{title}</h2>
				<button
					class="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
					onclick={onclose}
					aria-label="Close"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<!-- Body -->
			<div class="prose prose-stone prose-sm max-w-none px-6 py-5">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
