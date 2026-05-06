<script lang="ts">
	import { onMount } from 'svelte';
	import PlantIcon1 from '$lib/icons/noun-plant-6741.svg';
	import type { Plant } from '$lib/types/plant.js';

	interface PlantModalProps {
		plant: Plant;
		onclose: () => void;
	}

	let { plant, onclose }: PlantModalProps = $props();

	let closeBtn: HTMLButtonElement;
	let dialogEl: HTMLDivElement;

	onMount(() => closeBtn?.focus());

	function trapFocus(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onclose();
			return;
		}
		if (e.key !== 'Tab') return;
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

	function heightRange(min?: number, max?: number): string {
		if (min != null && max != null) return `${min}–${max} ft`;
		if (min != null) return `${min}+ ft`;
		if (max != null) return `up to ${max} ft`;
		return '';
	}
</script>

<div
	role="presentation"
	class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
	onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
>
	<div
		role="dialog"
		aria-modal="true"
		aria-label={plant.scientific_name}
		tabindex="-1"
		onkeydown={trapFocus}
		bind:this={dialogEl}
		class="relative w-[28rem] max-w-[92vw] rounded-xl bg-white p-6 shadow-2xl"
	>
		<button
			type="button"
			class="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-800"
			onclick={onclose}
			aria-label="Close"
			bind:this={closeBtn}
		>
			&times;
		</button>

		<!-- Header: icon left, names right -->
		<div class="flex items-center gap-4 pr-6">
			<img
				src={plant.image_url ?? PlantIcon1}
				alt={plant.scientific_name}
				class="h-20 w-20 shrink-0 rounded-lg object-contain"
			/>
			<div class="min-w-0">
				<p class="text-base font-semibold leading-snug text-stone-800">
					{plant.scientific_name ?? plant.name}
				</p>
				{#if plant.common_name.length}
					<p class="mt-0.5 text-sm italic text-stone-500">
						{plant.common_name.join(', ')}
					</p>
				{/if}
			</div>
		</div>

		<!-- Info table -->
		<table class="mt-4 w-full border-collapse text-sm">
			<tbody>
				{#if plant.plant_family}
					<tr class="border-t border-stone-100">
						<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Family</th>
						<td class="py-1.5 text-stone-800">{plant.plant_family}</td>
					</tr>
				{/if}
				{#if plant.plant_type?.length}
					<tr class="border-t border-stone-100">
						<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Type</th>
						<td class="py-1.5 text-stone-800">{plant.plant_type.join(', ')}</td>
					</tr>
				{/if}
				{#if heightRange(plant.height_min_ft, plant.height_max_ft)}
					<tr class="border-t border-stone-100">
						<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Height</th>
						<td class="py-1.5 text-stone-800">{heightRange(plant.height_min_ft, plant.height_max_ft)}</td>
					</tr>
				{/if}
				{#if plant.growth_rate}
					<tr class="border-t border-stone-100">
						<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Growth rate</th>
						<td class="py-1.5 text-stone-800">{plant.growth_rate}</td>
					</tr>
				{/if}
				{#if plant.lifespan?.length}
					<tr class="border-t border-stone-100">
						<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Lifespan</th>
						<td class="py-1.5 text-stone-800">{plant.lifespan.join(', ')}</td>
					</tr>
				{/if}
				{#if plant.flowering_months?.length}
					<tr class="border-t border-stone-100">
						<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Flowering</th>
						<td class="py-1.5 text-stone-800">{plant.flowering_months.join(', ')}</td>
					</tr>
				{/if}
				{#if plant.sun_and_shade?.length}
					<tr class="border-t border-stone-100">
						<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Sun / shade</th>
						<td class="py-1.5 text-stone-800">{plant.sun_and_shade.join(', ')}</td>
					</tr>
				{/if}
				{#if plant.soil_moisture?.length}
					<tr class="border-t border-stone-100">
						<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Soil moisture</th>
						<td class="py-1.5 text-stone-800">{plant.soil_moisture.join(', ')}</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
