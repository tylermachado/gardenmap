<script lang="ts">
import { onMount } from 'svelte';
import { base } from '$app/paths';
import { browser } from '$app/environment';
import type * as L from 'leaflet';
// @ts-ignore - Leaflet types are not always available
import * as topojson from 'topojson-client';

import usdaHardinessColors from '$lib/data/usda-hardiness-colors.json';
import epaEcoregionColorsData from '$lib/data/epa-ecoregion-colors.json';


const { center = [39.8283, -98.5795], zoom = 3.5, shapefiles = [], colorArray = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FCEA2B',
  '#FF9F43', '#EE5A24', '#0FB9B1', '#3742FA', '#2F3542'
], onMapClick } = $props();

let mapContainer: HTMLDivElement | null = null;
let map: L.Map | null = null;
let LeafletLib: typeof L | null = null;
let currentGeoJsonLayers: L.GeoJSON[] = [];
let searchMarker: L.Marker | null = null;

const epaEcoregionColors: { [key: string]: string } = {};
epaEcoregionColorsData.forEach(item => {
  epaEcoregionColors[item.code] = item.hex;
});

onMount(() => {
  if (!browser) return;
  let cleanup: (() => void) | null = null;
  (async () => {
    try {
      const leafletModule = await import('leaflet');
      LeafletLib = leafletModule.default;
      await import('leaflet/dist/leaflet.css');
      delete (LeafletLib.Icon.Default.prototype as any)._getIconUrl;
      LeafletLib.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
      map = LeafletLib.map(mapContainer!).setView(center, zoom);
      LeafletLib.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CARTO',
        minZoom: 4,
        maxZoom: 19
      }).addTo(map);
      const initialCenter = [...center] as [number, number];
      const initialZoom = zoom;
      const HomeControl = LeafletLib.Control.extend({
        options: { position: 'topleft' },
        onAdd: function () {
          const container = LeafletLib.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
          container.style.backgroundColor = 'white';
          container.style.width = '34px';
          container.style.height = '34px';
          container.style.display = 'flex';
          container.style.alignItems = 'center';
          container.style.justifyContent = 'center';
          container.title = 'Reset view';
          container.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12L12 3l9 9"/><path d="M9 21V9h6v12"/></svg>`;
          container.onclick = function () {
            map!.setView(initialCenter, initialZoom);
          };
          return container;
        }
      });
      map.addControl(new HomeControl());
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (onMapClick) {
          onMapClick(e.latlng.lat, e.latlng.lng);
        }
      });
      if (shapefiles.length > 0) {
        await loadShapefiles();
      }
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  })();
  cleanup = () => {
    if (map) {
      if (searchMarker) {
        map.removeLayer(searchMarker);
        searchMarker = null;
      }
      map.remove();
      map = null;
    }
  };
  return cleanup;
});


// --- Move loadShapefiles definition here ---
async function loadShapefiles(): Promise<void> {
  if (!browser || !LeafletLib || !map || !shapefiles) return;
  try {
    currentGeoJsonLayers.forEach((layer, index) => {
      if (map) {
        map.removeLayer(layer);
      }
    });
    currentGeoJsonLayers = [];
    if (shapefiles.length === 0) return;
    for (let i = 0; i < shapefiles.length; i++) {
      const shapefile = shapefiles[i];
      if (typeof shapefile !== 'string') continue;
      const styleFunction = (feature?: GeoJSON.Feature): L.PathOptions => {
        const unique = feature?.properties?.zone ?? feature?.properties?.US_L3CODE ?? 0;
        let color: string;
        if (feature?.properties?.zone && typeof feature.properties.zone === 'string') {
          const zoneValue = feature.properties.zone as string;
          color = usdaHardinessColors[zoneValue as keyof typeof usdaHardinessColors] || usdaHardinessColors['1a'];
        } else if (feature?.properties?.US_L3CODE) {
          const ecoregionCode = String(feature.properties.NA_L3CODE);
          color = epaEcoregionColors[ecoregionCode] || '#A5DCF5';
        } else {
          const hash = String(unique)
            .split('')
            .reduce((acc, char) => acc + char.charCodeAt(0), 0);
          color = colorArray[hash % colorArray.length];
        }
        const baseFillOpacity = 0.4 - (i * 0.1);
        return {
          color: color,
          weight: 0,
          opacity: 0,
          fillColor: color,
          fillOpacity: Math.max(baseFillOpacity, 0.1)
        };
      };
      let url = `${base}/${shapefile}`.replace(/\/+/, '/');
      if (!url.startsWith('/')) url = '/' + url;
      await loadGeoOrTopoJSON(url, styleFunction, i);
    }
  } catch (error) {
    console.error('Error loading shapefile data:', error);
  }
}

$effect(() => {
  if (shapefiles && map && LeafletLib) {
    loadShapefiles();
  }
});

export function updateSearchMarker(lat: number, lng: number, displayName: string): void {
  if (!browser || !LeafletLib || !map) return;
  if (searchMarker) {
    map.removeLayer(searchMarker);
    searchMarker = null;
  }
  if (displayName) {
    searchMarker = LeafletLib.marker([lat, lng]).addTo(map);
    searchMarker.bindPopup(displayName).openPopup();
  }
}

async function loadGeoOrTopoJSON(
  url: string,
  styleFunction?: (feature?: GeoJSON.Feature) => L.PathOptions,
  layerIndex?: number
): Promise<void> {
  const response: Response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  let geojsonData: GeoJSON.FeatureCollection;
  if (data.type === 'Topology') {
    const objectName = Object.keys(data.objects)[0];
    geojsonData = topojson.feature(data, data.objects[objectName]) as any;
  } else {
    geojsonData = data as GeoJSON.FeatureCollection;
  }
  addGeoJSONToMap(geojsonData, styleFunction, layerIndex);
}

function addGeoJSONToMap(
  geojsonData: GeoJSON.FeatureCollection, 
  styleFunction?: (feature?: GeoJSON.Feature) => L.PathOptions,
  layerIndex?: number
): void {
  if (!LeafletLib || !map) return;
  const geojsonLayer: L.GeoJSON = LeafletLib.geoJSON(geojsonData, {
    style: styleFunction || ((feature?: GeoJSON.Feature): L.PathOptions => ({
      color: '#3388ff',
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.3
    }))
  }).addTo(map);
  currentGeoJsonLayers.push(geojsonLayer);
}

// Export map instance for parent component access
export function getMap(): L.Map | null {
  return browser ? map : null;
}
export function addGeoJSONLayer(
  data: GeoJSON.FeatureCollection, 
  options?: L.GeoJSONOptions
): L.GeoJSON | null {
  if (!browser || !LeafletLib || !map) return null;
  const layer = LeafletLib.geoJSON(data, options).addTo(map);
  currentGeoJsonLayers.push(layer);
  return layer;
}
export function clearAllLayers(): void {
  if (!browser || !map) return;
  currentGeoJsonLayers.forEach(layer => {
    map?.removeLayer(layer);
  });
  currentGeoJsonLayers = [];
  if (searchMarker) {
    map.removeLayer(searchMarker);
    searchMarker = null;
  }
}
export function setView(center: [number, number], zoom: number): void {
  if (map) {
    map.setView(center, zoom);
  }
}
export function addSearchMarker(lat: number, lng: number, popupText?: string): void {
  if (!browser || !LeafletLib || !map) return;
  if (searchMarker) {
    map.removeLayer(searchMarker);
    searchMarker = null;
  }
  searchMarker = LeafletLib.marker([lat, lng]).addTo(map);
  if (popupText) {
    searchMarker.bindPopup(popupText).openPopup();
  }
}
export function removeSearchMarker(): void {
  if (!browser || !map || !searchMarker) return;
  map.removeLayer(searchMarker);
  searchMarker = null;
}
</script>

<div bind:this={mapContainer} class="map-container" style="width:100%;height:100%;overflow:hidden;"></div>

<style>
  .map-container {
    width: 100%;
    height: 100%;
    min-height: 0; /* Remove min-height to allow parent to control height */
    overflow: hidden;
  }

  :global(.leaflet-container) {
    height: 100%;
    width: 100%;
    min-height: 0;
  }
</style>