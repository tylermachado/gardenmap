import { PLANTS_API_URL } from '$env/static/private';
import type { RequestHandler } from '@sveltejs/kit';

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

		const allPlants: unknown[] = [];
		let currentOffset = parseInt(offset, 10) || 0;

		while (true) {
			const params = new URLSearchParams(baseParams);
			params.set('offset', String(currentOffset));

			const response = await fetch(`${PLANTS_API_URL}?${params.toString()}`);

			if (!response.ok) {
				throw new Error(`API request failed: ${response.status}`);
			}

			const page = await response.json() as unknown[];
			console.log('plants page:', `${PLANTS_API_URL}?${params.toString()}`, `(${page.length} results)`);
			allPlants.push(...page);

			if (page.length < LIMIT) break;
			currentOffset += LIMIT;
		}

		return new Response(JSON.stringify(allPlants), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
