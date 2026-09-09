import type { PageLoad } from './$types';
import { base } from '$app/paths';
import type { LayerOption } from '$lib/types/layer.js';

export type { LayerOption };

export const load: PageLoad = async ({ fetch }) => {
	try {
		const shapefilesRes = await fetch(`${base}/layers-list.json`);

		if (!shapefilesRes.ok) {
			throw new Error(`HTTP error! status: ${shapefilesRes.status}`);
		}

		const data = await shapefilesRes.json();
		const availableShapefiles: LayerOption[] = data.shapefiles || [];

		return {
			availableShapefiles
		};
	} catch (error) {
		console.error('Error loading shapefiles:', error);
		return {
			availableShapefiles: [],
			error: error instanceof Error ? error.message : 'Failed to load shapefiles'
		};
	}
};