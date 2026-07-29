import type { SearchResult, NominatimAddress } from '../types/layer.js';
import { toFullStateName } from '../utils/usStates.js';

export class GeocodingService {
  private static lastRequestTime = 0;
  private static readonly RATE_LIMIT_MS = 1000; // 1 second between requests
  private static readonly USER_AGENT = 'GardenMap/1.0 (https://github.com/tylermachado/gardenmap)';
  private static requestQueue: Promise<void> = Promise.resolve();
  private static readonly ZIP_API_BASE = '/api/zip';

  private static hasZipcode(query: string): boolean {
    // Match 5-digit or 5+4 digit ZIP codes
    const zipRegex = /\b\d{5}(?:-\d{4})?\b/;
    return zipRegex.test(query);
  }

  private static extractZipcode(query: string): string | null {
    const match = query.match(/\b\d{5}(?:-\d{4})?\b/);
    return match ? match[0].slice(0, 5) : null;
  }

  private static hasPlaceName(address: NominatimAddress | undefined): boolean {
    return Boolean(
      address?.neighbourhood ||
        address?.suburb ||
        address?.hamlet ||
        address?.village ||
        address?.town ||
        address?.city ||
        address?.municipality
    );
  }

  private static rateLimitedFetch(url: string): Promise<Response> {
    const next = this.requestQueue.then(async () => {
      const elapsed = Date.now() - this.lastRequestTime;
      if (elapsed < this.RATE_LIMIT_MS) {
        await new Promise<void>(resolve => setTimeout(resolve, this.RATE_LIMIT_MS - elapsed));
      }
      this.lastRequestTime = Date.now();
      return fetch(url, { headers: { 'User-Agent': this.USER_AGENT } });
    });
    // Advance the queue regardless of fetch success/failure so one error
    // doesn't block all subsequent requests.
    this.requestQueue = next.then(() => {}, () => {});
    return next;
  }

  static async reverseGeocode(lat: number, lon: number): Promise<SearchResult | null> {
    const primary = await this.zipLookup(lat, lon);
    if (primary) return primary;

    return this.nominatimReverse(lat, lon);
  }

  /**
   * Primary reverse geocoder: mynativeplantlist's Census-backed ZIP lookup.
   * Returns null (rather than throwing) on any failure so callers fall back
   * to Nominatim.
   */
  private static async zipLookup(lat: number, lon: number): Promise<SearchResult | null> {
    try {
      const response = await fetch(
        `${this.ZIP_API_BASE}?longitude=${lon}&latitude=${lat}`
      );
      if (!response.ok) return null;

      const data = await response.json();
      const zipcode: string | undefined = data?.zipcode;
      if (!zipcode) return null;

      const meta = await this.zipMetadata(zipcode);

      const displayName =
        meta?.city && meta?.state ? `${meta.city}, ${meta.state} ${zipcode}` : zipcode;

      return {
        lat,
        lon,
        display_name: displayName,
        address: {
          postcode: zipcode,
          city: meta?.city,
          state: meta?.state
        }
      };
    } catch (error) {
      console.error('ZIP lookup failed:', error);
      return null;
    }
  }

  /**
   * Looks up town/state metadata for a ZIP code. A small set of ZIP codes
   * aren't present in this dataset (404) — treated as "no metadata" rather
   * than an error, since the ZIP itself is still usable.
   */
  private static async zipMetadata(
    zipcode: string
  ): Promise<{ city?: string; state?: string } | null> {
    try {
      const response = await fetch(`${this.ZIP_API_BASE}/${zipcode}`);
      if (!response.ok) return null;

      const data = await response.json();
      return { city: data?.city, state: toFullStateName(data?.state) };
    } catch (error) {
      console.error('ZIP metadata lookup failed:', error);
      return null;
    }
  }

  /**
   * Backup reverse geocoder, used only when the primary ZIP lookup fails.
   */
  private static async nominatimReverse(lat: number, lon: number): Promise<SearchResult | null> {
    try {
      const response = await this.rateLimitedFetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&countrycodes=us`
      );

      const result = response.ok ? await response.json() : null;

      const hasUsAddress = result?.address && result.address.country_code === 'us';
      return hasUsAddress
        ? { lat, lon, address: result.address, display_name: result.display_name }
        : null;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return null;
    }
  }

  static async searchLocation(query: string): Promise<SearchResult | null> {
    if (!query) return null;
    
    // Require zipcode
    if (!this.hasZipcode(query)) {
      throw new Error('Please include a valid US ZIP code in your search (5-digit, e.g. 12345)');
    }
    
    try {
      const response = await this.rateLimitedFetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&addressdetails=1&q=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) return null;
      
      const results = await response.json();
      const result = results?.[0];

      if (!result) return null;

      const address: NominatimAddress = result.address ?? {};

      // Nominatim's postcode boundaries sometimes lack a city/town/village tag
      // (e.g. unincorporated ZCTAs like 99154/Mohler, WA). Fill in from the
      // Census-backed ZIP metadata used for map-click reverse geocoding, so
      // both paths resolve to the same place name.
      if (!this.hasPlaceName(address)) {
        const zipcode = this.extractZipcode(query);
        const meta = zipcode ? await this.zipMetadata(zipcode) : null;
        if (meta?.city) {
          address.city = meta.city;
        }
      }

      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        address,
        display_name: result.display_name
      };
    } catch (error) {
      console.error('Geocoding search failed:', error);
      return null;
    }
  }
}
