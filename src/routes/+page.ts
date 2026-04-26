import type { PageLoad } from './$types';
import { base } from '$app/paths';
import type { LayerOption } from '$lib/types/layer.js';

export type { LayerOption };

export const load: PageLoad = async ({ fetch }) => {
	try {
		const [shapefilesRes, propertiesRes] = await Promise.all([
			fetch(`${base}/layers-list.json`),
			fetch(`${base}/properties.json`)
		]);

		if (!shapefilesRes.ok) {
			throw new Error(`HTTP error! status: ${shapefilesRes.status}`);
		}

		const data = await shapefilesRes.json();
		const availableShapefiles: LayerOption[] = data.shapefiles || [];
		const propertiesConfig: Record<string, string[]> = propertiesRes.ok
			? await propertiesRes.json()
			: {};

		return {
			availableShapefiles,
			propertiesConfig
		};
	} catch (error) {
		console.error('Error loading shapefiles:', error);
		return {
			availableShapefiles: [],
			propertiesConfig: {},
			error: error instanceof Error ? error.message : 'Failed to load shapefiles'
		};
	}
};