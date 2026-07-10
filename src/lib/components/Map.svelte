<script module lang="ts">
  const geoDataCache: Record<string, GeoJSON.FeatureCollection> = {};
  let nurseryRecordsCache: Array<{
    uniqueId: number;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    phoneNumber: string | null;
    longitude: number;
    latitude: number;
    url: string | null;
  }> | null = null;
</script>

<script lang="ts">
import { onMount } from 'svelte';
import { base } from '$app/paths';
import { browser } from '$app/environment';
import type * as L from 'leaflet';
// @ts-ignore - Leaflet types are not always available
import * as topojson from 'topojson-client';

import usdaHardinessColors from '$lib/data/usda-hardiness-colors.json';
import epaEcoregionColorsData from '$lib/data/epa-ecoregion-colors.json';


interface MapProps {
  center?: [number, number];
  zoom?: number;
  shapefiles?: string[];
  colorArray?: string[];
  onMapClick?: (lat: number, lng: number) => void;
  onZoomChange?: (zoom: number) => void;
  marker?: { lat: number; lng: number } | null;
  showNurseries?: boolean;
}

const NURSERIES_URL = 'geodata/nurseries.json';

const { center = [39.8283, -98.5795], zoom = 4, shapefiles = [], colorArray = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FCEA2B',
  '#FF9F43', '#EE5A24', '#0FB9B1', '#3742FA', '#2F3542'
], onMapClick, onZoomChange, marker = null, showNurseries = false }: MapProps = $props();

let mapContainer: HTMLDivElement | null = null;
let map: L.Map | null = null;
let LeafletLib: typeof L | null = null;
let currentGeoJsonLayers: L.GeoJSON[] = [];
let searchMarker: L.Marker | null = null;
let resizeObserver: ResizeObserver | null = null;
let nurseryLayerGroup: L.MarkerClusterGroup | null = null;
let nurseryDataLoaded = false;

const epaEcoregionColors: { [key: string]: string } = {};
epaEcoregionColorsData.forEach(item => {
  epaEcoregionColors[item.code] = item.hex;
});

onMount(() => {
  if (!browser) return;
  let destroyed = false;
  (async () => {
    try {
      const leafletModule = await import('leaflet');
      if (destroyed) return;
      LeafletLib = leafletModule.default;
      await import('leaflet/dist/leaflet.css');
      // Extends the same Leaflet module instance with L.markerClusterGroup(); relies on
      // module resolution deduping 'leaflet' to the singleton already assigned above.
      await import('leaflet.markercluster');
      await import('leaflet.markercluster/dist/MarkerCluster.css');
      await import('leaflet.markercluster/dist/MarkerCluster.Default.css');
      if (destroyed) return;
      delete (LeafletLib.Icon.Default.prototype as any)._getIconUrl;
      LeafletLib.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
      map = LeafletLib.map(mapContainer!, { closePopupOnClick: false }).setView(center, zoom);
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
          LeafletLib.DomEvent.disableClickPropagation(container);
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
      map.on('zoomend', () => {
        if (onZoomChange && map) {
          onZoomChange(map.getZoom());
        }
      });
      if (shapefiles.length > 0) {
        await loadShapefiles();
      }
      if (marker) {
        addSearchMarker(marker.lat, marker.lng);
      }
      if (showNurseries) {
        await ensureNurseryLayerLoaded();
        updateNurseryVisibility();
      }
      // The map container's height is content-driven (it stretches to match the
      // adjacent info column), so the size can change after init when location
      // data loads or the window resizes. Keep Leaflet's internal size in sync.
      if (mapContainer) {
        resizeObserver = new ResizeObserver(() => {
          map?.invalidateSize();
        });
        resizeObserver.observe(mapContainer);
      }
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  })();
  return () => {
    destroyed = true;
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (map) {
      if (searchMarker) {
        map.removeLayer(searchMarker);
        searchMarker = null;
      }
      map.remove();
      map = null;
    }
    nurseryLayerGroup = null;
    nurseryDataLoaded = false;
  };
});

// --- Nursery pin layer: independent add-on, not exclusive with the polygon layers ---
async function ensureNurseryLayerLoaded(): Promise<void> {
  if (!browser || !LeafletLib || nurseryDataLoaded) return;
  nurseryDataLoaded = true;
  try {
    if (!nurseryRecordsCache) {
      let url = `${base}/${NURSERIES_URL}`.replace(/\/+/, '/');
      if (!url.startsWith('/')) url = '/' + url;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      nurseryRecordsCache = await response.json();
    }
    nurseryLayerGroup = LeafletLib.markerClusterGroup({
      maxClusterRadius: 60,
      iconCreateFunction: (cluster: L.MarkerCluster) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 32 : count < 100 ? 40 : 48;
        return LeafletLib!.divIcon({
          html: `<div>${count}</div>`,
          className: 'nursery-cluster-icon',
          iconSize: [size, size]
        });
      }
    });
    const nurseryMarkers = (nurseryRecordsCache ?? []).map((nursery) => {
      const nurseryMarker = LeafletLib!.circleMarker([nursery.latitude, nursery.longitude], {
        radius: 6,
        color: '#ffffff',
        weight: 1,
        fillColor: '#15803d',
        fillOpacity: 0.9
      });
      const location = [nursery.city, nursery.state].filter(Boolean).join(', ');
      const link = nursery.url ? `<br/><a href="${nursery.url}" target="_blank" rel="noopener noreferrer">${nursery.url}</a>` : '';
      nurseryMarker.bindPopup(
        `<strong>${nursery.name}</strong><br/>${[nursery.address, location].filter(Boolean).join('<br/>')}${nursery.phoneNumber ? `<br/>${nursery.phoneNumber}` : ''}${link}`
      );
      return nurseryMarker;
    });
    nurseryLayerGroup.addLayers(nurseryMarkers);
  } catch (error) {
    console.error('Error loading nursery data:', error);
    nurseryDataLoaded = false;
  }
}

function updateNurseryVisibility(): void {
  if (!browser || !map || !nurseryLayerGroup) return;
  const isShown = map.hasLayer(nurseryLayerGroup);
  if (showNurseries && !isShown) {
    nurseryLayerGroup.addTo(map);
  } else if (!showNurseries && isShown) {
    map.removeLayer(nurseryLayerGroup);
  }
}

$effect(() => {
  if (showNurseries && browser && map && LeafletLib) {
    ensureNurseryLayerLoaded().then(updateNurseryVisibility);
  } else {
    updateNurseryVisibility();
  }
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
        } else if (feature?.properties?.NA_L3CODE) {
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
  let geojsonData: GeoJSON.FeatureCollection;
  if (geoDataCache[url]) {
    geojsonData = geoDataCache[url];
  } else {
    const response: Response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.type === 'Topology') {
      const objectName = Object.keys(data.objects)[0];
      geojsonData = topojson.feature(data, data.objects[objectName]) as any;
    } else {
      geojsonData = data as GeoJSON.FeatureCollection;
    }
    geoDataCache[url] = geojsonData;
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
export function addSearchMarker(lat: number, lng: number): void {
  if (!browser || !LeafletLib || !map) return;
  if (searchMarker) {
    map.removeLayer(searchMarker);
    searchMarker = null;
  }
  searchMarker = LeafletLib.marker([lat, lng]).addTo(map);
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

  /* Leaflet's own .leaflet-marker-icon rule (display: block) loads asynchronously and can
     win the cascade tie-break against a same-specificity rule here, so pair the class with
     .leaflet-marker-icon to guarantee this wins regardless of stylesheet load order. */
  :global(.leaflet-marker-icon.nursery-cluster-icon) {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(21, 128, 61, 0.85);
    border: 2px solid #ffffff;
    border-radius: 50%;
    color: #ffffff;
    font-weight: bold;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  }
</style>