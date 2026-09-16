import { toFullStateName } from '../utils/usStates.js';

/** The fields mynativeplantlist's ZIP lookup resolves for a location. */
export interface LocationAddress {
  city?: string;
  state?: string;
  postcode?: string;
}

/**
 * Ecoregion + hardiness zone the ZIP endpoint resolves for a location. These are
 * authoritative: they are what the plants API matches on, so the UI displays the
 * same values it queries with rather than re-deriving them from map polygons.
 */
export interface ZipEnvironment {
  /** USDA hardiness zone as a bare integer, e.g. 6. The API has no half-zone. */
  hardinessZone: number;
  /** North American Level III ecoregion code, e.g. "8.1.7". */
  ecoregionCode: string;
  /** Level III name as the API spells it; display prefers the bundled layer's. */
  ecoregionName: string;
	/** USDA hardiness subzone as a string, this is the letter that follow the broader zone (e.g. a, b)*/
	hardinessSubzone: string;
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
  /**
   * null only when the ZIP lookup failed or came back incomplete. Every recognised
   * ZIP resolves all three fields, so null is an error state, not a normal one.
   */
  environment: ZipEnvironment | null;
  display_name: string;
}

export function isLayerSelected(layer: LayerOption, selectedLayers: LayerOption[]): boolean {
  return selectedLayers.some(selected => selected.name === layer.name);
}

export function getCityStateLabel(address: LocationAddress | null | undefined): string {
  return [address?.city, toFullStateName(address?.state)].filter(Boolean).join(', ');
}
