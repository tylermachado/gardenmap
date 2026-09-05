/**
 * Client-side access to the plants API.
 *
 * The site and the API share an origin in production (mynativeplantlist.com/api/...),
 * so the browser calls these relative paths directly — no CORS needed. Locally the
 * Vite dev server proxies /api/* to the upstream API (see vite.config.ts).
 *
 * This module owns the logic that previously lived in the SvelteKit /api/* server
 * routes: paginating past the backend's per-request cap, unioning name searches, and
 * trimming records down to the summary shape.
 */
import type { Plant, PlantSummary, PlantSearchResult } from '$lib/types/plant.js';

/** Same-origin base; routed to the backend by CloudFront (prod) or Vite (dev). */
const API_BASE = '/api/plants';

/** The backend caps each response at this many records; we page through in steps of it. */
const LIMIT = 250;

type PlantRecord = Record<string, unknown>;

/** Fields kept in the list/search response. Matches PlantSummary in $lib/types/plant. */
const SUMMARY_KEYS = new Set([
	'id',
	'name',
	'scientific_name',
	'common_name',
	'image_url',
	'images',
	'plant_type',
	'sun_and_shade',
	'soil_moisture',
	'monarchs',
	'native_bees',
	'honey_bees',
	'bombus',
	'butterflies',
	'moths',
	'hummingbirds',
	'beetles_wasps_flies',
	'bats',
	'nesting_and_structure_bees',
	'larval_host_monarch',
	'larval_host_butterfly',
	'larval_host_moth'
]);

function toSummary(plant: PlantRecord): PlantSummary {
	return Object.fromEntries(
		Object.entries(plant).filter(([k]) => SUMMARY_KEYS.has(k))
	) as unknown as PlantSummary;
}

/** The location keys a plant query can be matched on. */
export interface PlantLocation {
	/** North American Level III ecoregion code, e.g. "8.1.7" (the polygon's NA_L3CODE). */
	ecoregion?: string;
	/** USDA hardiness zone label, e.g. "7b" — reduced here to the integer the API wants. */
	zone?: string;
	/** Full state name, e.g. "Connecticut". The API returns nothing for abbreviations. */
	state?: string;
	/** Fallback for locations with no polygon data (a ZIP with no mappable area). */
	zipcode?: string;
}

/**
 * Location half of a plant query: a point is matched by ecoregion + hardiness zone + state.
 *
 * The API only honours `state` when BOTH `ecoregion` and `hardiness_zone` are also present
 * — sent with a partial set, or alongside `zipcode`, it is silently dropped and the response
 * is over-broad — so state only ever rides along with the complete triple. `hardiness_zone`
 * must be the bare integer; the API 400s on a half-zone letter like "7b".
 */
export function locationParams(location: PlantLocation): URLSearchParams {
	const params = new URLSearchParams();
	const zone = location.zone?.match(/^\d+/)?.[0] ?? location.zone;

	if (location.ecoregion && zone) {
		params.set('ecoregion', location.ecoregion);
		params.set('hardiness_zone', zone);
		if (location.state) params.set('state', location.state);
		return params;
	}

	// No polygon data: the point-in-polygon lookup is either still in flight, or this is a
	// ZIP with no mappable area, which never gets coordinates to analyze. Falling back to
	// the ZIP keeps plants on screen for both.
	if (location.zipcode) {
		params.set('zipcode', location.zipcode);
		return params;
	}

	// Only half the polygon data resolved; `state` would be ignored, so it is omitted.
	if (location.ecoregion) params.set('ecoregion', location.ecoregion);
	if (zone) params.set('hardiness_zone', zone);
	return params;
}

async function getPage(params: URLSearchParams, signal?: AbortSignal): Promise<PlantRecord[]> {
	const response = await fetch(`${API_BASE}?${params.toString()}`, { signal });
	if (!response.ok) throw new Error(`API request failed: ${response.status}`);
	return (await response.json()) as PlantRecord[];
}

/**
 * Every plant matching the given location/filter params, paged past the backend cap.
 * `params` already carries the location (from `locationParams`) and any filter keys.
 */
export async function fetchCandidatePlants(
	params: URLSearchParams,
	signal?: AbortSignal
): Promise<PlantSummary[]> {
	const all: PlantRecord[] = [];
	let offset = 0;

	while (true) {
		const page = new URLSearchParams(params);
		page.set('limit', String(LIMIT));
		page.set('offset', String(offset));

		const records = await getPage(page, signal);
		all.push(...records);

		if (records.length < LIMIT) break;
		offset += LIMIT;
	}

	return all.map(toSummary);
}

/** Union (by id) of a scientific_name and common_name search for `term`. */
async function searchByName(
	term: string,
	location: URLSearchParams,
	signal?: AbortSignal
): Promise<PlantRecord[]> {
	const byId = new Map<unknown, PlantRecord>();

	for (const field of ['scientific_name', 'common_name'] as const) {
		const params = new URLSearchParams(location);
		params.set(field, term);
		params.set('limit', String(LIMIT));

		for (const plant of await getPage(params, signal)) byId.set(plant.id, plant);
	}

	return [...byId.values()];
}

/**
 * Name search annotated with suitability: every catalog match, each flagged
 * `appropriate` (true/false) when a location is given, or `null` when it isn't.
 */
export async function searchPlants(
	term: string,
	location?: PlantLocation,
	signal?: AbortSignal
): Promise<PlantSearchResult[]> {
	const trimmed = term.trim();
	if (!trimmed) return [];

	const loc = location ? locationParams(location) : new URLSearchParams();
	const hasLocation = [...loc.keys()].length > 0;

	// All catalog matches (no location filter).
	const matches = await searchByName(trimmed, new URLSearchParams(), signal);

	// The subset that survives the location filter is "appropriate".
	let appropriateIds: Set<unknown> | null = null;
	if (hasLocation) {
		const appropriate = await searchByName(trimmed, loc, signal);
		appropriateIds = new Set(appropriate.map((p) => p.id));
	}

	return matches.map((plant) => ({
		...(toSummary(plant) as PlantSearchResult),
		appropriate: appropriateIds ? appropriateIds.has(plant.id) : null
	}));
}

/** Full record for a single plant. */
export async function fetchPlantDetail(
	id: PlantSummary['id'],
	signal?: AbortSignal
): Promise<Plant> {
	const response = await fetch(`${API_BASE}/${id}`, { signal });
	if (!response.ok) throw new Error(`Request failed: ${response.status}`);
	return (await response.json()) as Plant;
}
