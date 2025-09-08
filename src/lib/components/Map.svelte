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
  export let shapefiles: string[] = []; // Array of GeoJSON file paths for multiple layers

  let currentGeoJsonLayers: L.GeoJSON[] = [];
  let searchMarker: L.Marker | null = null;

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

        // Store the initial view for resetting
        const initialCenter = [...center] as [number, number];
        const initialZoom = zoom;

        // Custom Home Button Control
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

            // Simple "home" icon (SVG)
            container.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12L12 3l9 9"/><path d="M9 21V9h6v12"/></svg>`;

            container.onclick = function () {
              map.setView(initialCenter, initialZoom);
            };

            return container;
          }
        });

        // Add the home button just after the zoom controls
        map.addControl(new HomeControl());

        // Load and display shapefile data if shapefiles array is provided
        if (shapefiles.length > 0) {
          await loadShapefiles();
        }
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    })();

    cleanup = (): void => {
      if (map) {
        // Remove search marker if it exists
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

  // Your custom color array
  export let colorArray: string[] = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FCEA2B',
    '#FF9F43', '#EE5A24', '#0FB9B1', '#3742FA', '#2F3542'
  ];

  // Reactively reload GeoJSON when shapefiles array changes
  $: if (shapefiles && map && LeafletLib) {
    loadShapefiles();
  }

  async function loadShapefiles(): Promise<void> {
    if (!browser || !LeafletLib || !map || !shapefiles) return;
    
    try {
      // Remove all existing layers
      currentGeoJsonLayers.forEach(layer => {
        if (map) {
          map.removeLayer(layer);
        }
      });
      currentGeoJsonLayers = [];

      // If no shapefiles to load, we're done (layers have been cleared)
      if (shapefiles.length === 0) return;

      // Load each shapefile as a separate layer
      for (let i = 0; i < shapefiles.length; i++) {
        const shapefile = shapefiles[i];
        
        // Ensure shapefile is a string
        if (typeof shapefile !== 'string') {
          console.error('Shapefile entry must be a string, got:', shapefile);
          continue;
        }
        
        const styleFunction = (feature?: GeoJSON.Feature): L.PathOptions => {
          const unique = feature?.properties?.zone ?? feature?.properties?.US_L3CODE ?? 0;
          const hash = String(unique)
            .split('')
            .reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const color = colorArray[hash % colorArray.length];
          
          // Adjust opacity based on layer index for better overlay visualization
          const baseOpacity = 0.7 - (i * 0.1); // Decrease opacity for each subsequent layer
          const baseFillOpacity = 0.4 - (i * 0.1);
          
          return {
            color: color,
            weight: 2,
            opacity: Math.max(baseOpacity, 0.3), // Minimum opacity of 0.3
            fillColor: color,
            fillOpacity: Math.max(baseFillOpacity, 0.1) // Minimum fill opacity of 0.1
          };
        };

        let url = `${base}/${shapefile}`.replace(/\/+/g, '/');
        if (!url.startsWith('/')) url = '/' + url;
        await loadGeoOrTopoJSON(url, styleFunction, i);
      }
    } catch (error) {
      console.error('Error loading shapefile data:', error);
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

  // Additional utility functions with proper typing
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
    
    // Also remove search marker when clearing all layers
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

  // Add marker at specified coordinates
  export function addSearchMarker(lat: number, lng: number, popupText?: string): void {
    if (!browser || !LeafletLib || !map) return;
    
    // Remove existing search marker if it exists
    if (searchMarker) {
      map.removeLayer(searchMarker);
      searchMarker = null;
    }
    
    // Create new marker
    searchMarker = LeafletLib.marker([lat, lng]).addTo(map);
    
    // Add popup if text is provided
    if (popupText) {
      searchMarker.bindPopup(popupText).openPopup();
    }
  }

  // Remove search marker
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