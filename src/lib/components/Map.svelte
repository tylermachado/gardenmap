<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import type * as L from 'leaflet';

  let mapContainer: HTMLDivElement;
  let map: L.Map | null = null;
  let LeafletLib: typeof L | null = null;

  export let center: [number, number] = [40.7128, -74.0060]; // Default to NYC
  export let zoom: number = 10;
  export let geojsonFile: string = ''; // New prop for GeoJSON file path

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

        // Add a tile layer (OpenStreetMap)
        LeafletLib.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Load and display shapefile data if geojsonFile is provided
        if (geojsonFile) {
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
  $: if (geojsonFile && map && LeafletLib) {
    loadShapefiles();
  }

  async function loadShapefiles(): Promise<void> {
    if (!browser || !LeafletLib || !map || !geojsonFile) return;
    
    try {
      // Remove previous layer if it exists
      if (currentGeoJsonLayer) {
        map.removeLayer(currentGeoJsonLayer);
        currentGeoJsonLayer = null;
      }

      let colorIndex = 0;
      const styleFunction = (feature?: GeoJSON.Feature): L.PathOptions => {
        const color = colorArray[colorIndex % colorArray.length];
        colorIndex++;
        return {
          color: color,
          weight: 2,
          opacity: 0.8,
          fillColor: color,
          fillOpacity: 0.5
        };
      };

      // Load with your custom styling function using the prop
      await loadGeoJSON(geojsonFile, styleFunction);
      
    } catch (error) {
      console.error('Error loading shapefile data:', error);
    }
  }

  async function loadGeoJSON(
    url: string, 
    styleFunction?: (feature?: GeoJSON.Feature) => L.PathOptions
  ): Promise<void> {
    const response: Response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const geojsonData: GeoJSON.FeatureCollection = await response.json();
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
    map.fitBounds(geojsonLayer.getBounds());
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

<div bind:this={mapContainer} class="map-container"></div>

<style>
  .map-container {
    width: 100%;
    height: 100%;
    min-height: 500px;
  }

  :global(.leaflet-container) {
    height: 100%;
    width: 100%;
  }
</style>