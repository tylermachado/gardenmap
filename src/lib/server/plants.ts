/** Server-only helpers for talking to the upstream plants API. */

export type PlantRecord = Record<string, unknown>;

/** Fields kept in the list/search response. Matches PlantSummary in src/lib/types/plant.ts. */
export const SUMMARY_KEYS = new Set([
	'id', 'name', 'scientific_name', 'common_name', 'image_url', 'images',
	'plant_type', 'sun_and_shade', 'soil_moisture',
	'monarchs', 'native_bees', 'honey_bees', 'bombus', 'butterflies',
	'moths', 'hummingbirds', 'beetles_wasps_flies', 'bats',
	'nesting_and_structure_bees', 'larval_host_monarch',
	'larval_host_butterfly', 'larval_host_moth',
]);

export function toSummary(plant: PlantRecord): PlantRecord {
	return Object.fromEntries(
		Object.entries(plant).filter(([k]) => SUMMARY_KEYS.has(k))
	);
}
