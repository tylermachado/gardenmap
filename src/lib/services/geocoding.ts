import type { SearchResult, LocationAddress, ZipEnvironment } from '../types/layer.js';
import { toFullStateName } from '../utils/usStates.js';

type Centroid = [lat: number, lon: number];

interface ZipMetadata {
  city?: string;
  state?: string;
  /** ZIP the API substituted when the requested one has no area of its own. */
  matchedZip?: string;
  /**
   * Ecoregion + hardiness zone for the ZIP, or null when the response was missing one
   * of them. Every recognised ZIP should resolve all three of ecoregion, zone and
   * state, so null means the API returned something it shouldn't have.
   */
  environment: ZipEnvironment | null;
}

export class GeocodingService {
  private static readonly ZIP_API_BASE = '/api/zip';
  // ZCTA internal points/centroids from the 2024 US Census Gazetteer.
  private static readonly CENTROIDS_URL = '/geodata/zip-centroids.json';
  private static centroids: Promise<Record<string, Centroid>> | null = null;

  private static extractZipcode(query: string): string | null {
    const match = query.match(/\b\d{5}(?:-\d{4})?\b/);
    return match ? match[0].slice(0, 5) : null;
  }

  /**
   * Fetches the ZIP centroid table once and reuses it. A failed load isn't
   * cached, so the next search retries rather than being stuck offline.
   */
  private static loadCentroids(): Promise<Record<string, Centroid>> {
    if (!this.centroids) {
      this.centroids = fetch(this.CENTROIDS_URL)
        .then(response => {
          if (!response.ok) throw new Error(`ZIP centroids unavailable (${response.status})`);
          return response.json();
        })
        .catch(error => {
          this.centroids = null;
          throw error;
        });
    }
    return this.centroids;
  }

  /**
   * Reverse geocodes a point via mynativeplantlist's Census-backed ZIP lookup.
   * Returns null (rather than throwing) when the point isn't inside a US ZIP
   * code area, so callers can quietly ignore off-map clicks.
   */
  static async reverseGeocode(lat: number, lon: number): Promise<SearchResult | null> {
    try {
      const response = await fetch(`${this.ZIP_API_BASE}?longitude=${lon}&latitude=${lat}`);
      if (!response.ok) return null;

      const data = await response.json();
      const zipcode: string | undefined = data?.zipcode;
      if (!zipcode) return null;

      return this.toSearchResult(zipcode, lat, lon);
    } catch (error) {
      console.error('ZIP lookup failed:', error);
      return null;
    }
  }

  /**
   * Forward geocodes a ZIP code to its Census internal point. Throws with a
   * user-facing message for problems the searcher can fix, and returns null if
   * the centroid table can't be loaded.
   */
  static async searchLocation(query: string): Promise<SearchResult | null> {
    if (!query) return null;

    const zipcode = this.extractZipcode(query);
    if (!zipcode) {
      throw new Error('Please include a valid US ZIP code in your search (5-digit, e.g. 12345)');
    }

    let centroids: Record<string, Centroid>;
    let meta: ZipMetadata | null;
    try {
      [centroids, meta] = await Promise.all([this.loadCentroids(), this.zipMetadata(zipcode)]);
    } catch (error) {
      console.error('ZIP centroid lookup failed:', error);
      return null;
    }

    let centroid = centroids[zipcode];

    // Substitute the centroid of a nearby ZIP if the requested one has no ZCTA.
    if (!centroid && meta?.matchedZip) {
      centroid = centroids[meta.matchedZip];
    }

    // Neither the ZIP nor its substitute has a centroid, so omit pin.
    if (!centroid) {
      if (!meta) {
        throw new Error(`We don't have map data for ZIP code ${zipcode}. Try a nearby ZIP code.`);
      }
      return this.toSearchResult(zipcode, null, null, meta);
    }

    // Keep the typed ZIP as the result's postcode even when the coordinates
    // came from its matched neighbor.
    const [lat, lon] = centroid;
    return this.toSearchResult(zipcode, lat, lon, meta);
  }

  /**
   * Builds the result for a ZIP code. Both the search and map-click paths go
   * through here so they always resolve to the same place name for a ZIP.
   */
  private static async toSearchResult(
    zipcode: string,
    lat: number | null,
    lon: number | null,
    prefetched?: ZipMetadata | null
  ): Promise<SearchResult> {
    const meta = prefetched !== undefined ? prefetched : await this.zipMetadata(zipcode);
    const address: LocationAddress = {
      postcode: zipcode,
      city: meta?.city,
      state: meta?.state
    };

    // The plant query needs state alongside ecoregion and zone, so a response missing
    // any of the three is incomplete rather than partially usable.
    let environment = meta?.environment ?? null;
    if (environment && !address.state) {
      console.error(`ZIP ${zipcode} resolved an ecoregion and zone but no state`);
      environment = null;
    }

    return {
      lat,
      lon,
      address,
      environment,
      display_name:
        address.city && address.state ? `${address.city}, ${address.state} ${zipcode}` : zipcode
    };
  }

  /**
   * Looks up a ZIP code's town/state plus the ecoregion and hardiness zone the plants
   * API matches on. Taking all of them from this one response is what keeps the panel
   * and the plant query describing the same place.
   */
  private static async zipMetadata(zipcode: string): Promise<ZipMetadata | null> {
    try {
      const response = await fetch(`${this.ZIP_API_BASE}/${zipcode}`);
      if (!response.ok) return null;

      const data = await response.json();
      const matchedZip: unknown = data?.matched_zip;

      return {
        city: data?.city,
        state: toFullStateName(data?.state),
        matchedZip: typeof matchedZip === 'string' ? matchedZip : undefined,
        environment: this.toEnvironment(zipcode, data)
      };
    } catch (error) {
      console.error('ZIP metadata lookup failed:', error);
      return null;
    }
  }

  /**
   * Pulls the ecoregion and hardiness zone out of a ZIP response. `ecoregions` is a
   * list, but a ZIP resolves to a single ecoregion for plant matching, so the first
   * entry is the one used. Returns null — and says so loudly — when either is absent,
   * since a recognised ZIP is expected to carry both.
   */
  private static toEnvironment(zipcode: string, data: any): ZipEnvironment | null {
    const zone = data?.hardiness_zone;
    const ecoregion = Array.isArray(data?.ecoregions) ? data.ecoregions[0] : undefined;
    const code: unknown = ecoregion?.code;
		const subzone = data?.hardiness_subzone;

    if (typeof zone !== 'number' || typeof code !== 'string' || !code) {
      console.error(`ZIP ${zipcode} returned an incomplete ecoregion/zone`, data);
      return null;
    }

    return {
      hardinessZone: zone,
      ecoregionCode: code,
      ecoregionName: typeof ecoregion?.name === 'string' ? ecoregion.name : '',
			hardinessSubzone: subzone
    };
  }
}
