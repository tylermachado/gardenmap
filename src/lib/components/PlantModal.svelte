<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import type { Plant, PlantSummary } from '$lib/types/plant.js';
	import { fetchPlantDetail } from '$lib/api/plants.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { savedPlants } from '$lib/stores/savedPlants.svelte.js';

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
		fetchPlantDetail(plant.id)
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

	// Reflect the open plant in the URL (?plant=<id>) so the modal is shareable and
	// restorable on load; clear it again when this modal closes/unmounts. Reads $page via
	// untrack (not $effect) so unrelated URL changes elsewhere (e.g. map zoom) don't
	// re-fire this and fight with goto in a loop.
	onMount(() => {
		const params = new URLSearchParams(untrack(() => $page.url.searchParams));
		params.set('plant', plant.id);
		goto(`?${params.toString()}`, { replaceState: true, noScroll: true, keepFocus: true });
	});

	onDestroy(() => {
		clearTimeout(copiedTimeout);
		const currentUrl = untrack(() => $page.url);
		// Only clean up the URL if this modal still "owns" the current plant param.
		// searchParams values are always strings, so coerce plant.id (which the API
		// can return as a number despite the PlantSummary type) before comparing.
		if (currentUrl.searchParams.get('plant') !== String(plant.id)) return;
		const params = new URLSearchParams(currentUrl.searchParams);
		params.delete('plant');
		const query = params.toString();
		goto(`${currentUrl.pathname}${query ? `?${query}` : ''}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	});

	let copied = $state(false);
	let copiedTimeout: ReturnType<typeof setTimeout> | undefined;

	// Built explicitly (not read from $page.url) because the ?plant= param is added via an
	// async goto() in onMount — $page.url may not have caught up yet if the user shares
	// immediately after the modal opens.
	function shareUrl(): string {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('plant', String(plant.id));
		return `${$page.url.origin}${$page.url.pathname}?${params.toString()}`;
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(shareUrl());
			copied = true;
			clearTimeout(copiedTimeout);
			copiedTimeout = setTimeout(() => (copied = false), 1500);
		} catch {
			// Clipboard API unavailable (e.g. insecure context); nothing more we can do here.
		}
	}

	// Prefer the native OS share sheet (mobile browsers, Safari) and fall back to
	// copy-to-clipboard everywhere else.
	async function share() {
		if (navigator.share) {
			try {
				await navigator.share({
					title: plant.scientific_name ?? plant.name,
					text: plant.common_name?.length ? plant.common_name.join(', ') : undefined,
					url: shareUrl()
				});
			} catch (err) {
				// AbortError just means the user dismissed the share sheet.
				if ((err as Error)?.name !== 'AbortError') await copyLink();
			}
			return;
		}
		await copyLink();
	}

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
	const PlantIcon1 = '/logos/plant.svg';

	// Gallery: the image list comes from detail once loaded, falling back to the summary.
	let images = $derived((detail ?? plant).images ?? []);
	let imageIndex = $state(0);

	// Keep the index valid if the underlying image list changes (e.g. when detail loads).
	$effect(() => {
		if (imageIndex >= images.length) imageIndex = 0;
	});

	let currentImageUrl = $derived(
		images[imageIndex]?.img_file_name
			? `${IMG_BASE_URL}${images[imageIndex].img_file_name}`
			: ((detail ?? plant).image_url ?? PlantIcon1)
	);
	let currentAttribution = $derived(
		images[imageIndex]?.img_src_attribution === 'Lady Bird'
			? `Courtesy of ${images[imageIndex]?.img_attribution}, Lady Bird Johnson Wildflower Center`
			: images[imageIndex]?.img_attribution
	);

	function prevImage() {
		if (images.length) imageIndex = (imageIndex - 1 + images.length) % images.length;
	}
	function nextImage() {
		if (images.length) imageIndex = (imageIndex + 1) % images.length;
	}

	// True if the plant summary already carries a real image URL
	let hasImage = $derived(!!(plant.images?.length || plant.image_url));

	// Save target: prefer the richer detail record once loaded, falling back to the summary.
	let saveTarget = $derived(detail ?? plant);
	let saved = $derived(savedPlants.isSaved(plant.id));

	function heightRange(min?: number, max?: number): string {
		if (min != null && max != null) return `${min}–${max} ft`;
		if (min != null) return `${min}+ ft`;
		if (max != null) return `up to ${max} ft`;
		return '';
	}
</script>

{#snippet heartButton()}
	<button
		type="button"
		class="absolute right-24 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow ring-1 ring-black/5 backdrop-blur-sm hover:bg-stone-100 {saved
			? 'text-red-600'
			: 'text-stone-500 hover:text-stone-800'}"
		onclick={() => savedPlants.toggle(saveTarget)}
		aria-pressed={saved}
		aria-label={saved ? 'Remove from My Saved Plants' : 'Add to My Saved Plants'}
	>
		<svg class="h-5 w-5" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 21s-6.716-4.35-9.428-8.223C.686 10.25 1.03 6.9 3.343 5.06c2.02-1.61 4.774-1.24 6.2.6L12 8.4l2.457-2.74c1.426-1.84 4.18-2.21 6.2-.6 2.313 1.84 2.657 5.19.771 7.717C18.716 16.65 12 21 12 21z"
			/>
		</svg>
	</button>
{/snippet}

{#snippet shareButton()}
	<div class="absolute right-14 top-3">
		<button
			type="button"
			class="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-stone-500 shadow ring-1 ring-black/5 backdrop-blur-sm hover:bg-stone-100 hover:text-stone-800"
			onclick={share}
			aria-label="Share this plant"
		>
			{#if copied}
				<svg class="h-5 w-5 text-lime-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			{:else}
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m0-3-3-3m0 0-3 3m3-3v11.25"
					/>
				</svg>
			{/if}
		</button>
		<span
			aria-live="polite"
			class="pointer-events-none absolute right-0 top-11 whitespace-nowrap rounded bg-stone-800 px-2 py-1 text-[11px] text-white shadow transition-opacity duration-200 {copied ? 'opacity-100' : 'opacity-0'}"
		>
			{copied ? 'Link copied!' : ''}
		</span>
	</div>
{/snippet}

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
			class="relative flex h-[85vh] max-h-[90vh] w-[58rem] max-w-[92vw] flex-col overflow-hidden rounded-xl bg-white shadow-2xl md:h-auto md:flex-row"
		>
			<!-- Top (mobile) / Left (desktop): image gallery -->
			<div class="flex w-full shrink-0 basis-1/2 flex-col bg-stone-900 md:w-1/2 md:basis-auto">
				<div class="relative flex-1">
					<img
						src={currentImageUrl}
						alt={plant.scientific_name}
						class="absolute inset-0 h-full w-full object-cover"
					/>
					{#if images.length > 1}
						<!-- Prev/next arrows, vertically centered on each side of the photo -->
						<button
							type="button"
							class="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
							onclick={prevImage}
							aria-label="Previous image"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
							</svg>
						</button>
						<button
							type="button"
							class="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
							onclick={nextImage}
							aria-label="Next image"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</button>
					{/if}
				</div>
				{#if currentAttribution}
					<!-- Attribution bar: full width now that arrows overlay the photo -->
					<div class="shrink-0 px-2 py-1 text-center text-[12px] text-white/60">
						{currentAttribution}
					</div>
				{/if}
			</div>

			<!-- Bottom (mobile) / Right (desktop): close button + names + table -->
			<div class="flex flex-1 flex-col overflow-y-auto p-6">
				{@render heartButton()}
				{@render shareButton()}
				<button
					type="button"
					class="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg text-stone-500 shadow ring-1 ring-black/5 backdrop-blur-sm hover:bg-stone-100 hover:text-stone-800"
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
			{@render heartButton()}
			{@render shareButton()}
			<button
				type="button"
				class="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg text-stone-500 shadow ring-1 ring-black/5 backdrop-blur-sm hover:bg-stone-100 hover:text-stone-800"
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
