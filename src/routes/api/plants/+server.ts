import { PLANTS_API_URL } from '$env/static/private';
import type { RequestHandler } from '@sveltejs/kit';
import { toSummary, type PlantRecord } from '$lib/server/plants';

/** Filter params the upstream API accepts that we forward from the client. */
const FILTER_PARAMS = [
	'plant_type', 'sun_and_shade', 'soil_moisture',
	'monarchs', 'native_bees', 'honey_bees', 'bombus', 'butterflies',
	'moths', 'hummingbirds', 'beetles_wasps_flies', 'bats',
	'nesting_and_structure_bees', 'larval_host_monarch',
	'larval_host_butterfly', 'larval_host_moth',
] as const;

export const GET: RequestHandler = async ({ url }) => {
	const offset = url.searchParams.get('offset') || '0';
	const ecoregion = url.searchParams.get('ecoregion');
	const zone = url.searchParams.get('zone');
	const zipcode = url.searchParams.get('zipcode');

	const LIMIT = 250;

	try {
		const baseParams = new URLSearchParams();
		if (ecoregion) baseParams.set('ecoregion', ecoregion);
		if (zone) baseParams.set('zone', zone);
		if (zipcode) baseParams.set('zipcode', zipcode);
		baseParams.set('limit', String(LIMIT));

		for (const key of FILTER_PARAMS) {
			const val = url.searchParams.get(key);
			if (val !== null) baseParams.set(key, val);
		}

		const allPlants: PlantRecord[] = [];
		let currentOffset = parseInt(offset, 10) || 0;

		while (true) {
			const params = new URLSearchParams(baseParams);
			params.set('offset', String(currentOffset));

			const response = await fetch(`${PLANTS_API_URL}?${params.toString()}`);

			if (!response.ok) {
				throw new Error(`API request failed: ${response.status}`);
			}

			const page = await response.json() as PlantRecord[];
			allPlants.push(...page);

			if (page.length < LIMIT) break;
			currentOffset += LIMIT;
		}

		return new Response(JSON.stringify(allPlants.map(toSummary)), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
