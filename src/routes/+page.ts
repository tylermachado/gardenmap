import type { PageLoad } from './$types';

export interface LayerOption {
	name: string;
	path: string;
	description?: string;
}

declare module '/shapefiles.json' {
  const value: LayerOption[];
  export default value;
}

export const load: PageLoad = async ({ fetch }) => {
	try {
		// Using fetch, NOT import
		const response = await fetch('/shapefiles.json');
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const availableShapefiles: LayerOption[] = await response.json();

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
