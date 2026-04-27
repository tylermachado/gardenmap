export interface Plant {
	id: string;
	name: string;
	scientific_name?: string;
	common_name: Array<string>;
	plant_family?: string;
	plant_type?: Array<string>;
	height_min_ft?: number;
	height_max_ft?: number;
	growth_rate?: string;
	lifespan?: Array<string>;
	flowering_months?: Array<string>;
	sun_and_shade?: Array<string>;
	soil_moisture?: Array<string>;
	image_url?: string;
}
