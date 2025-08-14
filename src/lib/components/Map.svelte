<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';

  import { browser } from '$app/environment';
  import type * as L from 'leaflet';
  // @ts-ignore - Leaflet types are not always available
  import * as topojson from 'topojson-client';

  let mapContainer: HTMLDivElement;
  let map: L.Map | null = null;
  let LeafletLib: typeof L | null = null;

  export let center: [number, number] = [39.8283, -98.5795]; // Center of continental US
  export let zoom: number = 3.5;
  export let shapefile: string = ''; // New prop for GeoJSON file path

  let currentGeoJsonLayer: L.GeoJSON | null = null;

  onMount((): (() => void) | void => {
    if (!browser) return;

    let cleanup: (() => void) | null = null;

    (async (): Promise<void> => {
      try {
        // Dynamically import Leaflet only on the client side
        const leafletModule = await import('leaflet');
        LeafletLib = leafletModule.default;

        // Import Leaflet CSS
        await import('leaflet/dist/leaflet.css');

        // Initialize the map
        map = LeafletLib.map(mapContainer).setView(center, zoom);

        // Add a tile layer (Carto Positron Light)
        LeafletLib.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap, © CARTO',
          maxZoom: 19
        }).addTo(map);

        // Load and display shapefile data if geojsonFile is provided
        if (shapefile) {
          await loadShapefiles();
        }
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    })();

    cleanup = (): void => {
      if (map) {
        map.remove();
        map = null;
      }
    };

    return cleanup;
  });

  // Your custom color array
  export let colorArray: string[] = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FCEA2B',
    '#FF9F43', '#EE5A24', '#0FB9B1', '#3742FA', '#2F3542'
  ];

  // Reactively reload GeoJSON when geojsonFile changes
  $: if (shapefile && map && LeafletLib) {
    loadShapefiles();
  }

  async function loadShapefiles(): Promise<void> {
    if (!browser || !LeafletLib || !map || !shapefile) return;
    try {
      if (currentGeoJsonLayer) {
        map.removeLayer(currentGeoJsonLayer);
        currentGeoJsonLayer = null;
      }
      const styleFunction = (feature?: GeoJSON.Feature): L.PathOptions => {
        const unique = feature?.properties?.zone ?? feature?.properties?.US_L3CODE ?? 0;
        const hash = String(unique)
          .split('')
          .reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const color = colorArray[hash % colorArray.length];
        return {
          color: color,
          weight: 2,
          opacity: 0.8,
          fillColor: color,
          fillOpacity: 0.5
        };
      };
      let url = `${base}/${shapefile}`.replace(/\/+/g, '/');
      if (!url.startsWith('/')) url = '/' + url;
      await loadGeoOrTopoJSON(url, styleFunction);
    } catch (error) {
      console.error('Error loading shapefile data:', error);
    }
  }

  async function loadGeoOrTopoJSON(
    url: string,
    styleFunction?: (feature?: GeoJSON.Feature) => L.PathOptions
  ): Promise<void> {
    const response: Response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    let geojsonData: GeoJSON.FeatureCollection;
    if (data.type === 'Topology') {
      const objectName = Object.keys(data.objects)[0];
      geojsonData = topojson.feature(data, data.objects[objectName]) as GeoJSON.FeatureCollection;
    } else {
      geojsonData = data as GeoJSON.FeatureCollection;
    }
    addGeoJSONToMap(geojsonData, styleFunction);
  }

  function addGeoJSONToMap(
    geojsonData: GeoJSON.FeatureCollection, 
    styleFunction?: (feature?: GeoJSON.Feature) => L.PathOptions
  ): void {
    if (!LeafletLib || !map) return;

    // Remove previous layer if it exists
    if (currentGeoJsonLayer) {
      map.removeLayer(currentGeoJsonLayer);
      currentGeoJsonLayer = null;
    }

    const geojsonLayer: L.GeoJSON = LeafletLib.geoJSON(geojsonData, {
      style: styleFunction || ((feature?: GeoJSON.Feature): L.PathOptions => ({
        color: '#3388ff',
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.3
      })),
      onEachFeature: (feature: GeoJSON.Feature, layer: L.Layer): void => {
        if (feature.properties && 'bindPopup' in layer) {
          const popupContent: string = Object.entries(feature.properties)
            .map(([key, value]: [string, unknown]) => `<strong>${key}:</strong> ${value}`)
            .join('<br>');
          (layer as L.Layer & { bindPopup: (content: string) => void }).bindPopup(popupContent);
        }
      }
    }).addTo(map);

    currentGeoJsonLayer = geojsonLayer;
  }

  // Export map instance for parent component access
  export function getMap(): L.Map | null {
    return browser ? map : null;
  }

  // Additional utility functions with proper typing
  export function addGeoJSONLayer(
    data: GeoJSON.FeatureCollection, 
    options?: L.GeoJSONOptions
  ): L.GeoJSON | null {
    if (!browser || !LeafletLib || !map) return null;
    
    return LeafletLib.geoJSON(data, options).addTo(map);
  }

  export function setView(center: [number, number], zoom: number): void {
    if (map) {
      map.setView(center, zoom);
    }
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