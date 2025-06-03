import type { PageLoad } from './$types';

export interface LayerOption {
	name: string;
	path: string;
	description?: string;
}

export const load: PageLoad = async ({ fetch }) => {
	try {
		// Using fetch, NOT import
		const response = await fetch('/shapefiles.json');
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.json();
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