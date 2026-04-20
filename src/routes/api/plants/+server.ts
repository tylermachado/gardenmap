import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
	const offset = url.searchParams.get('offset') || '0';
	const ecoregion = url.searchParams.get('ecoregion');
	const zone = url.searchParams.get('zone');

	try {
		const response = await fetch(
			`http://100.109.30.31:8000/plants?offset=${offset}&ecoregion=${encodeURIComponent(ecoregion || '')}&zone=${encodeURIComponent(zone || '')}`
		);

		if (!response.ok) {
			throw new Error(`API request failed: ${response.status}`);
		}

		const data = await response.json();
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
