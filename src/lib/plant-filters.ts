import type { PlantSummary } from '$lib/types/plant.js';

/**
 * Canonical filter option values. These mirror the distinct values the plants
 * API returns for every location, so they can be offered before a location is
 * chosen (e.g. on the splash screen) without first fetching results.
 */
export const PLANT_TYPE_OPTIONS = [
	'Cactus', 'Fern', 'Grass', 'Grass-like', 'Perennial',
	'Shrub', 'Subshrub', 'Succulent', 'Tree', 'Vine',
] as const;

export const SUN_SHADE_OPTIONS = ['Sun', 'Part-shade', 'Shade'] as const;

export const MOISTURE_OPTIONS = ['Dry', 'Moist', 'Wet'] as const;

export const POLLINATOR_KEYS: { key: keyof PlantSummary; label: string }[] = [
	{ key: 'monarchs', label: 'Monarchs' },
	{ key: 'native_bees', label: 'Native bees' },
	{ key: 'honey_bees', label: 'Honey bees' },
	{ key: 'bombus', label: 'Bumblebees' },
	{ key: 'butterflies', label: 'Butterflies' },
	{ key: 'moths', label: 'Moths' },
	{ key: 'hummingbirds', label: 'Hummingbirds' },
	{ key: 'beetles_wasps_flies', label: 'Beetles/wasps/flies' },
	{ key: 'bats', label: 'Bats' },
	{ key: 'nesting_and_structure_bees', label: 'Nesting bees' },
	{ key: 'larval_host_monarch', label: 'Larval host: monarch' },
	{ key: 'larval_host_butterfly', label: 'Larval host: butterfly' },
	{ key: 'larval_host_moth', label: 'Larval host: moth' },
];

/** Shared, mutable filter selection used by the splash and the results panel. */
export interface PlantFilterState {
	plantType: string;
	sunShade: string;
	moisture: string;
	pollinators: Set<string>;
}

export function createPlantFilters(): PlantFilterState {
	return { plantType: '', sunShade: '', moisture: '', pollinators: new Set() };
}

export function clearPlantFilters(f: PlantFilterState): void {
	f.plantType = '';
	f.sunShade = '';
	f.moisture = '';
	f.pollinators = new Set();
}

export function countActiveFilters(f: PlantFilterState): number {
	return (
		(f.plantType ? 1 : 0) +
		(f.sunShade ? 1 : 0) +
		(f.moisture ? 1 : 0) +
		(f.pollinators.size > 0 ? 1 : 0)
	);
}

export function hasActiveFilters(f: PlantFilterState): boolean {
	return countActiveFilters(f) > 0;
}

/** Append the active filter selections to a URLSearchParams for /api/plants. */
export function applyPlantFilterParams(f: PlantFilterState, params: URLSearchParams): void {
	if (f.plantType) params.set('plant_type', f.plantType);
	if (f.sunShade) params.set('sun_and_shade', f.sunShade);
	if (f.moisture) params.set('soil_moisture', f.moisture);
	for (const k of f.pollinators) params.set(k, 'true');
}
