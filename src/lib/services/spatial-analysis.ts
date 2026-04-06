import * as topojson from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { LayerOption } from '../types/layer.js';

export class SpatialAnalysisService {
  private static layerGeoCache: Record<string, GeoJSON.FeatureCollection> = {};
  
  static async analyzePoint(
    lat: number, 
    lon: number, 
    layers: LayerOption[], 
    propertiesConfig: Record<string, string[]>
  ): Promise<Record<string, Record<string, any>>> {
    try {
      // Dynamic import to keep initial bundle small
      const { booleanPointInPolygon, point } = await import('@turf/turf');
      const pt = point([lon, lat]); // GeoJSON uses [lon, lat]
      const results: Record<string, Record<string, any>> = {};

      for (const layer of layers) {
        const fc = await this.getLayerData(layer.path);
        if (!fc) continue;
        
        const layerKey = this.keyFromPath(layer.path);
        const allowed = propertiesConfig[layerKey] || [];
        
        for (const feature of fc.features) {
          if (this.isPolygonFeature(feature) && booleanPointInPolygon(pt, feature as any)) {
            results[layerKey] = this.filterProperties(feature.properties || {}, allowed);
            break; // Stop at first containing polygon per layer
          }
        }
      }
      
      return results;
    } catch (e) {
      console.error('Failed resolving point data', e);
      return {};
    }
  }
  
  private static async getLayerData(layerPath: string): Promise<GeoJSON.FeatureCollection | null> {
    const normalized = this.normalizeLayerPath(layerPath);
    if (this.layerGeoCache[normalized]) return this.layerGeoCache[normalized];
    
    try {
      const res = await fetch(normalized);
      if (!res.ok) return null;
      const data = await res.json();

      let fc: GeoJSON.FeatureCollection;
      if (data.type === 'Topology') {
        // TopoJSON — convert the first object to GeoJSON
        const topo = data as Topology;
        const objectKey = Object.keys(topo.objects)[0];
        fc = topojson.feature(topo, topo.objects[objectKey]) as GeoJSON.FeatureCollection;
      } else {
        fc = data as GeoJSON.FeatureCollection;
      }

      this.layerGeoCache[normalized] = fc;
      return fc;
    } catch (e) {
      console.error('Failed fetching layer', layerPath, e);
      return null;
    }
  }
  
  private static normalizeLayerPath(path: string): string {
    return path.replace(/^(\.\.\/)+/, '').replace(/^\/+/, '');
  }
  
  private static keyFromPath(path: string): string {
    const file = path.split('/').pop() || '';
    return file.replace(/\.(geo)?json$/i, '');
  }
  
  private static isPolygonFeature(feature: GeoJSON.Feature): boolean {
    if (!feature.geometry) return false;
    const gType = feature.geometry.type;
    return gType === 'Polygon' || gType === 'MultiPolygon';
  }
  
  private static filterProperties(props: Record<string, any>, allowed: string[]): Record<string, any> {
    const filtered: Record<string, any> = {};
    for (const key of allowed) {
      if (key in props) filtered[key] = props[key];
    }
    return filtered;
  }
}
