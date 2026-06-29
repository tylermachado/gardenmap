<script lang="ts">
	import { onMount } from 'svelte';
	import PlantIcon1 from '$lib/icons/noun-plant-6741.svg';
	import type { Plant, PlantSummary } from '$lib/types/plant.js';

	interface PlantModalProps {
		plant: PlantSummary;
		onclose: () => void;
	}

	let { plant, onclose }: PlantModalProps = $props();

	let detail: Plant | null = $state(null);
	let loadingDetail = $state(true);

	let closeBtn: HTMLButtonElement;
	let dialogEl: HTMLDivElement;

	onMount(() => {
		closeBtn?.focus();
		fetch(`/api/plants/${plant.id}`)
			.then((res) => {
				if (!res.ok) throw new Error(`Request failed: ${res.status}`);
				return res.json() as Promise<Plant>;
			})
			.then((data) => {
				detail = data;
			})
			.catch(() => {
				// detail stays null; detail-only fields simply won't render
			})
			.finally(() => {
				loadingDetail = false;
			});
	});

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

	const IMG_BASE_URL = 'https://d10s8hlfsm6n8p.cloudfront.net/images/';

	function getImageUrl(p: typeof plant | typeof detail): string {
		if (!p) return PlantIcon1;
		const file = p.images?.[0]?.img_file_name;
		if (file) return `${IMG_BASE_URL}${file}`;
		return p.image_url ?? PlantIcon1;
	}

	// True if the plant summary already carries a real image URL
	let hasImage = $derived(!!(plant.images?.length || plant.image_url));

	function heightRange(min?: number, max?: number): string {
		if (min != null && max != null) return `${min}–${max} ft`;
		if (min != null) return `${min}+ ft`;
		if (max != null) return `up to ${max} ft`;
		return '';
	}
</script>

<div
	role="presentation"
	class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
	onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
>
	{#if hasImage}
		<!-- Two-column layout: image fills left half, info on right -->
		<div
			role="dialog"
			aria-modal="true"
			aria-label={plant.scientific_name}
			tabindex="-1"
			onkeydown={trapFocus}
			bind:this={dialogEl}
			class="relative flex w-[52rem] max-w-[92vw] overflow-hidden rounded-xl bg-white shadow-2xl"
		>
			<!-- Left: full-height image -->
			<div class="relative w-1/2 shrink-0">
				<img
					src={getImageUrl(detail ?? plant)}
					alt={plant.scientific_name}
					class="absolute inset-0 h-full w-full object-cover"
				/>
				{#if (detail ?? plant).images?.[0]?.img_attribution}
					<p class="absolute bottom-1 left-0 right-0 text-center text-[8px] leading-tight text-white/60">
						{(detail ?? plant).images?.[0]?.img_attribution}
					</p>
				{/if}
			</div>

			<!-- Right: close button + names + table -->
			<div class="flex flex-1 flex-col overflow-y-auto p-6">
				<button
					type="button"
					class="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-800"
					onclick={onclose}
					aria-label="Close"
					bind:this={closeBtn}
				>
					&times;
				</button>

				<div class="pr-6">
					<p class="text-base font-semibold leading-snug text-stone-800">
						{plant.scientific_name ?? plant.name}
					</p>
					{#if plant.common_name.length}
						<p class="mt-0.5 text-sm italic text-stone-500">
							{plant.common_name.join(', ')}
						</p>
					{/if}
				</div>

				<table class="mt-4 w-full border-collapse text-sm">
					<tbody>
						{#if plant.plant_type?.length}
							<tr class="border-t border-stone-100">
								<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Type</th>
								<td class="py-1.5 text-stone-800">{plant.plant_type.join(', ')}</td>
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
						{#if loadingDetail}
							<tr class="border-t border-stone-100">
								<td colspan="2" class="py-2 text-[11px] italic text-stone-400">Loading details…</td>
							</tr>
						{:else if detail}
							{#if detail.plant_family}
								<tr class="border-t border-stone-100">
									<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Family</th>
									<td class="py-1.5 text-stone-800">{detail.plant_family}</td>
								</tr>
							{/if}
							{#if heightRange(detail.height_min_ft, detail.height_max_ft)}
								<tr class="border-t border-stone-100">
									<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Height</th>
									<td class="py-1.5 text-stone-800">{heightRange(detail.height_min_ft, detail.height_max_ft)}</td>
								</tr>
							{/if}
							{#if detail.growth_rate}
								<tr class="border-t border-stone-100">
									<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Growth rate</th>
									<td class="py-1.5 text-stone-800">{detail.growth_rate}</td>
								</tr>
							{/if}
							{#if detail.lifespan?.length}
								<tr class="border-t border-stone-100">
									<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Lifespan</th>
									<td class="py-1.5 text-stone-800">{detail.lifespan.join(', ')}</td>
								</tr>
							{/if}
							{#if detail.flowering_months?.length}
								<tr class="border-t border-stone-100">
									<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Flowering</th>
									<td class="py-1.5 text-stone-800">{detail.flowering_months.join(', ')}</td>
								</tr>
							{/if}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<!-- Single-column layout: no image -->
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

			<div class="pr-6">
				<p class="text-base font-semibold leading-snug text-stone-800">
					{plant.scientific_name ?? plant.name}
				</p>
				{#if plant.common_name.length}
					<p class="mt-0.5 text-sm italic text-stone-500">
						{plant.common_name.join(', ')}
					</p>
				{/if}
			</div>

			<table class="mt-4 w-full border-collapse text-sm">
				<tbody>
					{#if plant.plant_type?.length}
						<tr class="border-t border-stone-100">
							<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Type</th>
							<td class="py-1.5 text-stone-800">{plant.plant_type.join(', ')}</td>
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
					{#if loadingDetail}
						<tr class="border-t border-stone-100">
							<td colspan="2" class="py-2 text-[11px] italic text-stone-400">Loading details…</td>
						</tr>
					{:else if detail}
						{#if detail.plant_family}
							<tr class="border-t border-stone-100">
								<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Family</th>
								<td class="py-1.5 text-stone-800">{detail.plant_family}</td>
							</tr>
						{/if}
						{#if heightRange(detail.height_min_ft, detail.height_max_ft)}
							<tr class="border-t border-stone-100">
								<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Height</th>
								<td class="py-1.5 text-stone-800">{heightRange(detail.height_min_ft, detail.height_max_ft)}</td>
							</tr>
						{/if}
						{#if detail.growth_rate}
							<tr class="border-t border-stone-100">
								<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Growth rate</th>
								<td class="py-1.5 text-stone-800">{detail.growth_rate}</td>
							</tr>
						{/if}
						{#if detail.lifespan?.length}
							<tr class="border-t border-stone-100">
								<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Lifespan</th>
								<td class="py-1.5 text-stone-800">{detail.lifespan.join(', ')}</td>
							</tr>
						{/if}
						{#if detail.flowering_months?.length}
							<tr class="border-t border-stone-100">
								<th class="w-2/5 py-1.5 pr-3 text-left font-medium text-stone-500">Flowering</th>
								<td class="py-1.5 text-stone-800">{detail.flowering_months.join(', ')}</td>
							</tr>
						{/if}
					{/if}
				</tbody>
			</table>
		</div>
	{/if}
</div>
