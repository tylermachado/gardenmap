import type { SearchResult, NominatimAddress } from '../types/layer.js';

export class GeocodingService {
  private static lastRequestTime = 0;
  private static readonly RATE_LIMIT_MS = 1000; // 1 second between requests
  private static readonly USER_AGENT = 'GardenMap/1.0 (https://github.com/tylermachado/gardenmap)';
  private static requestQueue: Promise<void> = Promise.resolve();

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
      
      if (!response.ok) return null;
      
      const result = await response.json();
      
      if (!result || !result.address) return null;

      if (result.address.country_code !== 'us') return null;
      
      return {
        lat,
        lon,
        address: result.address,
        display_name: result.display_name
      };
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
