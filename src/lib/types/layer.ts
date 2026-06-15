export interface NominatimAddress {
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface LayerOption {
  name: string;
  path: string;
  description?: string;
}

export interface LayerData {
  [layerKey: string]: Record<string, any>;
}

export interface MapSearchResult {
  address: NominatimAddress;
  layerData: Record<string, Record<string, any>>;
}

export interface LocationData {
  lat: number;
  lng: number;
  address?: NominatimAddress;
}

export interface SearchResult {
  lat: number;
  lon: number;
  address: NominatimAddress;
  display_name: string;
}

export function isLayerSelected(layer: LayerOption, selectedLayers: LayerOption[]): boolean {
  return selectedLayers.some(selected => selected.name === layer.name);
}

export function getCityStateLabel(address: NominatimAddress | null | undefined): string {
  return [
    address?.suburb,
    address?.village,
    address?.town,
    address?.city,
    address?.state,
    address?.country
  ]
    .filter(Boolean)
    .join(', ');
}
