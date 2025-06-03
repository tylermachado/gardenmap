<script>
  import { onMount } from 'svelte';
  import L from 'leaflet';

  let mapContainer;
  let map;

  export let center = [40.7128, -74.0060]; // Default to NYC
  export let zoom = 10;

  onMount(async () => {
    // Import Leaflet CSS
    await import('leaflet/dist/leaflet.css');

    // Initialize the map
    map = L.map(mapContainer).setView(center, zoom);

    // Add a tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Load and display shapefile data
    loadShapefiles();

    return () => {
      if (map) {
        map.remove();
      }
    };
  });

  async function loadShapefiles() {
    try {
      // Example: Load GeoJSON data (converted from shapefile)
      const response = await fetch('/data/your-shapefile.geojson');
      const geojsonData = await response.json();

      // Add GeoJSON layer to map
      const geojsonLayer = L.geoJSON(geojsonData, {
        style: {
          color: '#3388ff',
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.3
        },
        onEachFeature: (feature, layer) => {
          // Add popups with feature properties
          if (feature.properties) {
            layer.bindPopup(
              Object.entries(feature.properties)
                .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                .join('<br>')
            );
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
  export function getMap() {
    return map;
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