import type { SearchResult, NominatimAddress } from '../types/layer.js';

export class GeocodingService {
  private static lastRequestTime = 0;
  private static readonly RATE_LIMIT_MS = 1000; // 1 second between requests
  private static readonly USER_AGENT = 'GardenMap/1.0 (https://github.com/tylermachado/gardenmap)';
  private static requestQueue: Promise<void> = Promise.resolve();
  private static readonly GEOCODIO_API_KEY = import.meta.env.VITE_GEOCODIO_API_KEY as string | undefined;

  private static hasZipcode(query: string): boolean {
    // Match 5-digit or 5+4 digit ZIP codes
    const zipRegex = /\b\d{5}(?:-\d{4})?\b/;
    return zipRegex.test(query);
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
    try {
      const response = await this.rateLimitedFetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&countrycodes=us`
      );

      const result = response.ok ? await response.json() : null;

      const hasUsAddress = result?.address && result.address.country_code === 'us';
      const nominatim: SearchResult | null = hasUsAddress
        ? { lat, lon, address: result.address, display_name: result.display_name }
        : null;

      // Nominatim doesn't always return a postcode for a point. Fall back to
      // Geocodio to recover the ZIP so downstream ZIP-based lookups still work.
      if (nominatim?.address.postcode) return nominatim;

      const geocodio = await this.geocodioReverse(lat, lon);
      if (!geocodio) return nominatim;

      if (nominatim) {
        // Keep Nominatim's richer address, just backfill the missing ZIP.
        nominatim.address.postcode = geocodio.address.postcode;
        return nominatim;
      }

      return geocodio;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return null;
    }
  }

  /**
   * Backup reverse geocoder. Returns a result only when Geocodio yields a US
   * ZIP code. Requires VITE_GEOCODIO_API_KEY; a no-op when it's unset.
   */
  private static async geocodioReverse(lat: number, lon: number): Promise<SearchResult | null> {
    if (!this.GEOCODIO_API_KEY) return null;

    try {
      const response = await fetch(
        `https://api.geocod.io/v1.7/reverse?q=${lat},${lon}&api_key=${this.GEOCODIO_API_KEY}`
      );

      if (!response.ok) return null;

      const data = await response.json();
      const result = data?.results?.[0];
      const components = result?.address_components;

      const postcode: string | undefined = components?.zip;
      if (!postcode) return null;
      if (components?.country && components.country !== 'US') return null;

      return {
        lat,
        lon,
        display_name: result.formatted_address ?? '',
        address: {
          city: components.city,
          county: components.county,
          state: components.state,
          postcode,
          country: components.country
        }
      };
    } catch (error) {
      console.error('Geocodio reverse geocoding failed:', error);
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
      
      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        address: result.address,
        display_name: result.display_name
      };
    } catch (error) {
      console.error('Geocoding search failed:', error);
      return null;
    }
  }
}
