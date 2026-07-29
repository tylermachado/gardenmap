export interface NominatimAddress {
  neighbourhood?: string;
  suburb?: string;
  hamlet?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
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
  const place =
    address?.neighbourhood ??
    address?.suburb ??
    address?.hamlet ??
    address?.village ??
    address?.town ??
    address?.city ??
    address?.municipality ??
    address?.county;

  return [place, address?.state].filter(Boolean).join(', ');
}
