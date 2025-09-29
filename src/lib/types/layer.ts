export interface LayerOption {
  name: string;
  path: string;
  description?: string;
}

export interface LayerData {
  [layerKey: string]: Record<string, any>;
}

export interface MapSearchResult {
  address: any;
  layerData: Record<string, Record<string, any>>;
}

export interface LocationData {
  lat: number;
  lng: number;
  address?: any;
}

export interface SearchResult {
  lat: number;
  lon: number;
  address: any;
  display_name: string;
}
