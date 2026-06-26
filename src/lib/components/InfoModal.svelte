<script lang="ts">
	import type { Snippet } from 'svelte';

	interface InfoModalProps {
		title: string;
		open: boolean;
		onclose: () => void;
		children: Snippet;
	}

	let { title, open, onclose, children }: InfoModalProps = $props();

	let closeBtn: HTMLButtonElement | undefined = $state();
	let dialogEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (open && closeBtn) closeBtn.focus();
	});

	function trapFocus(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onclose();
			return;
		}
		if (e.key !== 'Tab' || !dialogEl) return;
		const focusable = Array.from(
			dialogEl.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
			)
		).filter((el) => !el.closest('[inert]'));
		if (!focusable.length) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (e.shiftKey) {
			if (document.activeElement === first) {
				e.preventDefault();
				last.focus();
			}
		} else {
			if (document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}
</script>

{#if open}
	<div
		role="presentation"
		class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
		onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
	>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="info-modal-title"
			tabindex="-1"
			onkeydown={trapFocus}
			bind:this={dialogEl}
			class="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-lg bg-white shadow-xl"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-stone-200 px-6 py-4">
				<h2 id="info-modal-title" class="text-lg font-semibold text-stone-900">{title}</h2>
				<button
					bind:this={closeBtn}
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
			<div class="modal-content px-6 py-5">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
