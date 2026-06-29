import { PLANTS_API_URL } from '$env/static/private';
import type { RequestHandler } from '@sveltejs/kit';
import { toSummary, type PlantRecord } from '$lib/server/plants';

const LIMIT = 250;

/**
 * Location params used to decide suitability. Must mirror what the candidate
 * list (CandidatePlants) sends so the verdict matches that grid — today just
 * `zipcode`, with ecoregion/zone supported for when those get wired in.
 */
const LOCATION_PARAMS = ['zipcode', 'ecoregion', 'zone'] as const;

/** Fetch the union (by id) of a scientific_name and common_name search for `term`. */
async function searchByName(term: string, location: URLSearchParams): Promise<PlantRecord[]> {
	const byId = new Map<unknown, PlantRecord>();

	for (const field of ['scientific_name', 'common_name'] as const) {
		const params = new URLSearchParams(location);
		params.set(field, term);
		params.set('limit', String(LIMIT));

		const response = await fetch(`${PLANTS_API_URL}?${params.toString()}`);
		if (!response.ok) throw new Error(`API request failed: ${response.status}`);

		const page = (await response.json()) as PlantRecord[];
		for (const plant of page) byId.set(plant.id, plant);
	}

	return [...byId.values()];
}

export const GET: RequestHandler = async ({ url }) => {
	const term = (url.searchParams.get('q') ?? '').trim();
	if (!term) {
		return new Response(JSON.stringify([]), {
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Collect any location params the client passed through.
	const location = new URLSearchParams();
	for (const key of LOCATION_PARAMS) {
		const val = url.searchParams.get(key);
		if (val) location.set(key, val);
	}
	const hasLocation = [...location.keys()].length > 0;

	try {
		// All catalog matches (no location filter).
		const matches = await searchByName(term, new URLSearchParams());

		// The subset that survives the location filter is "appropriate".
		let appropriateIds: Set<unknown> | null = null;
		if (hasLocation) {
			const appropriate = await searchByName(term, location);
			appropriateIds = new Set(appropriate.map((p) => p.id));
		}

		const results = matches.map((plant) => ({
			...toSummary(plant),
			appropriate: appropriateIds ? appropriateIds.has(plant.id) : null
		}));

		return new Response(JSON.stringify(results), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
