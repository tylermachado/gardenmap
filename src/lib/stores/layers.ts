import { writable } from 'svelte/store';
import type { LayerOption } from '../types/layer.js';

function createLayerStore() {
  const { subscribe, set, update } = writable<LayerOption[]>([]);
  
  return {
    subscribe,
    toggle: (layer: LayerOption) => update(layers => {
      const exists = layers.some(l => l.name === layer.name);
      return exists 
        ? layers.filter(l => l.name !== layer.name)
        : [...layers, layer];
    }),
    clear: () => set([]),
    set,
    isSelected: (layer: LayerOption, currentLayers: LayerOption[]) => 
      currentLayers.some(l => l.name === layer.name)
  };
}

export const selectedLayers = createLayerStore();
