import type { SearchResult } from '../types/layer.js';

export class GeocodingService {
  static async searchLocation(query: string): Promise<SearchResult | null> {
    if (!query) return null;
    
    try {
      const response = await fetch(
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
