import { toFullStateName } from '../utils/usStates.js';

/** The fields mynativeplantlist's ZIP lookup resolves for a location. */
export interface LocationAddress {
  city?: string;
  state?: string;
  postcode?: string;
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
  address: LocationAddress;
  layerData: Record<string, Record<string, any>>;
}

export interface LocationData {
  lat: number;
  lng: number;
  address?: LocationAddress;
}

export interface SearchResult {
  /** null when the ZIP is real but has no mappable area — show it without a pin. */
  lat: number | null;
  lon: number | null;
  address: LocationAddress;
  display_name: string;
}

export function isLayerSelected(layer: LayerOption, selectedLayers: LayerOption[]): boolean {
  return selectedLayers.some(selected => selected.name === layer.name);
}

export function getCityStateLabel(address: LocationAddress | null | undefined): string {
  return [address?.city, toFullStateName(address?.state)].filter(Boolean).join(', ');
}
