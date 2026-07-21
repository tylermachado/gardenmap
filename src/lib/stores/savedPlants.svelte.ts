import { browser } from '$app/environment';
import type { PlantSummary } from '$lib/types/plant.js';

const STORAGE_KEY = 'mnpl:savedPlants';

function loadInitial(): PlantSummary[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as PlantSummary[]) : [];
	} catch {
		return [];
	}
}

class SavedPlantsStore {
	plants: PlantSummary[] = $state(loadInitial());

	isSaved(id: string): boolean {
		return this.plants.some((p) => p.id === id);
	}

	toggle(plant: PlantSummary) {
		if (this.isSaved(plant.id)) {
			this.remove(plant.id);
		} else {
			this.plants = [...this.plants, plant];
			this.persist();
		}
	}

	remove(id: string) {
		this.plants = this.plants.filter((p) => p.id !== id);
		this.persist();
	}

	private persist() {
		if (!browser) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.plants));
		} catch {
			// Storage unavailable/full (e.g. private browsing); saved list just won't persist.
		}
	}
}

export const savedPlants = new SavedPlantsStore();
