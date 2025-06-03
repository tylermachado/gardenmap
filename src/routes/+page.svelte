<script lang="ts">
  import Map from '$lib/components/Map.svelte';
  import type * as L from 'leaflet';
  
  let mapRef: Map | null = null;
  let selectedLayer: string = 'all';

  interface LayerOption {
    id: string;
    name: string;
  }

  const layers: LayerOption[] = [
    { id: 'all', name: 'All Layers' },
    { id: 'boundaries', name: 'Administrative Boundaries' },
    { id: 'roads', name: 'Road Networks' },
    { id: 'water', name: 'Water Bodies' }
  ];

  function handleLayerChange(): void {
    // Logic to toggle layers based on selection
    console.log('Selected layer:', selectedLayer);
    
    // You can call methods on the map instance here
    const map: L.Map | null = mapRef?.getMap() ?? null;
    if (map) {
      // Add layer filtering logic here
      console.log('Map instance available for layer operations');
    }
  }
</script>

<svelte:head>
  <title>Interactive Map</title>
  <meta name="description" content="Explore geographic data with interactive maps" />
</svelte:head>

<main>
  <h1>Geographic Data Explorer</h1>
  
  <div class="controls">
    <label for="layer-select">Select Layer:</label>
    <select id="layer-select" bind:value={selectedLayer} on:change={handleLayerChange}>
      {#each layers as layer}
        <option value={layer.id}>{layer.name}</option>
      {/each}
    </select>
  </div>

  <div class="map-wrapper">
    <Map 
      bind:this={mapRef}
      center={[39.8283, -98.5795]} 
      zoom={4}
    />
  </div>
</main>

<style>
  main {
    padding: 1rem;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  h1 {
    margin: 0 0 1rem 0;
    color: #333;
  }

  .controls {
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .controls label {
    font-weight: bold;
  }

  .controls select {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .map-wrapper {
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
  }
</style>