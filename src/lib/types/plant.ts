/** A single image associated with a plant. */
export interface PlantImage {
	img_file_name: string;
	img_src_url?: string;
	img_attribution?: string;
}

/** Lightweight shape returned by GET /api/plants (list endpoint). */
export interface PlantSummary {
	id: string;
	name: string;
	scientific_name?: string;
	common_name: Array<string>;
	image_url?: string;
	/** Ordered list of images; the UI currently uses images[0], but more may be shown later. */
	images?: PlantImage[];
	plant_type?: Array<string>;
	sun_and_shade?: Array<string>;
	soil_moisture?: Array<string>;
	monarchs?: boolean;
	native_bees?: boolean;
	honey_bees?: boolean;
	bombus?: boolean;
	butterflies?: boolean;
	moths?: boolean;
	hummingbirds?: boolean;
	beetles_wasps_flies?: boolean;
	bats?: boolean;
	nesting_and_structure_bees?: boolean;
	larval_host_monarch?: boolean;
	larval_host_butterfly?: boolean;
	larval_host_moth?: boolean;
}

/** A name-search match, annotated with whether it suits the current location. */
export interface PlantSearchResult extends PlantSummary {
	/** true/false once a location is set; null when no location was provided. */
	appropriate: boolean | null;
}

/** Full shape returned by GET /api/plants/:id (detail endpoint). */
export interface Plant extends PlantSummary {
	plant_family?: string;
	height_min_ft?: number;
	height_max_ft?: number;
	growth_rate?: string;
	lifespan?: Array<string>;
	flowering_months?: Array<string>;
}
