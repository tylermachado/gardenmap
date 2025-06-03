<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import type * as L from 'leaflet';

  let mapContainer: HTMLDivElement;
  let map: L.Map | null = null;
  let LeafletLib: typeof L | null = null;

  export let center: [number, number] = [40.7128, -74.0060]; // Default to NYC
  export let zoom: number = 10;

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

        // Load and display shapefile data
        await loadShapefiles();
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

  async function loadShapefiles(): Promise<void> {
    if (!browser || !LeafletLib || !map) return;
    
    try {
      // Example: Load GeoJSON data (converted from shapefile)
      const response: Response = await fetch('/data/your-shapefile.geojson');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const geojsonData: GeoJSON.FeatureCollection = await response.json();

      // Add GeoJSON layer to map
      const geojsonLayer: L.GeoJSON = LeafletLib.geoJSON(geojsonData, {
        style: {
          color: '#3388ff',
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.3
        },
        onEachFeature: (feature: GeoJSON.Feature, layer: L.Layer): void => {
          // Add popups with feature properties
          if (feature.properties && 'bindPopup' in layer) {
            const popupContent: string = Object.entries(feature.properties)
              .map(([key, value]: [string, unknown]) => `<strong>${key}:</strong> ${value}`)
              .join('<br>');
            (layer as L.Layer & { bindPopup: (content: string) => void }).bindPopup(popupContent);
          }
        }
      }).addTo(map);

      // Fit map to layer bounds
      map.fitBounds(geojsonLayer.getBounds());
    } catch (error) {
      console.error('Error loading shapefile data:', error);
    }
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