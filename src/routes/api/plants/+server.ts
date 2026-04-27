import { PLANTS_API_URL } from '$env/static/private';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
	const offset = url.searchParams.get('offset') || '0';
	const ecoregion = url.searchParams.get('ecoregion');
	const zone = url.searchParams.get('zone');
	const zipcode = url.searchParams.get('zipcode');

	try {
		const params = new URLSearchParams({ offset });
		if (ecoregion) params.set('ecoregion', ecoregion);
		if (zone) params.set('zone', zone);
		if (zipcode) params.set('zipcode', zipcode);
        params.set('limit', '250');

		const response = await fetch(`${PLANTS_API_URL}?${params.toString()}`);

		if (!response.ok) {
			throw new Error(`API request failed: ${response.status}`);
		}

		const data = await response.json();
		console.log('plants data:', `${PLANTS_API_URL}?${params.toString()}`);
		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
