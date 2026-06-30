# MyNativePlantList

A SvelteKit map application (package name `MyNativePlantList`) for discovering native plants suited to a US location. Pick a spot on the map or search a ZIP code to see the plant-hardiness zone and ecoregion you land in, browse the plants appropriate for that location, filter them, and check whether a specific plant by name is a good fit.

Built with SvelteKit (Svelte 5 runes), Leaflet for the map, Turf.js for point-in-polygon lookups, and Tailwind CSS. It ships as a static site via `@sveltejs/adapter-static`.

---

## How it works

The app has two complementary flows, both driven from the home page ([src/routes/+page.svelte](src/routes/+page.svelte)):

- **Location → plants.** Clicking the map or searching a ZIP code geocodes the point (client-side, via Nominatim), resolves which hardiness zone / ecoregion polygon contains it (client-side, via Turf), and fetches the plants appropriate for that location.
- **Plant name → suitability.** Searching by plant name lists catalog matches and, once a location is set, annotates each match with whether it suits that location.

Geocoding and the polygon lookup happen in the browser against bundled GeoJSON. Plant data is fetched directly from the browser via [src/lib/api/plants.ts](src/lib/api/plants.ts), which calls the plants API at the same-origin path `/api/plants/*`. In production the site and the API share an origin (`mynativeplantlist.com/api/...`), so these calls need no CORS; in local development the Vite dev server proxies `/api/*` to the API origin given by `PLANTS_API_URL` (see [vite.config.ts](vite.config.ts)).

---

## Project structure

```
src/
  routes/
    +page.svelte                  # Home page; orchestrates map, search, filters, results
    +page.ts                      # Loads layers-list.json and properties.json
  lib/
    api/plants.ts                 # Browser client for the plants API: candidate list
                                  #   (paged), name search + suitability, detail, summary
    components/                   # Map, SearchBar, LocationInfo, CandidatePlants,
                                  #   PlantFilters, PlantModal, PlantSearchResults, InfoModal
    services/geocoding.ts         # Nominatim geocoding (rate-limited, US-only)
    services/spatial-analysis.ts  # Turf point-in-polygon over bundled layers
    plant-filters.ts              # Canonical filter options + shared filter state
    types/plant.ts                # PlantSummary, PlantSearchResult, Plant, PlantImage
    types/layer.ts                # Layer / geocoding address types + helpers
static/                          # Map layers, GeoJSON, shapefiles, images (see below)
```

---

## Development

```bash
npm install
npm run dev          # start dev server
npm run dev -- --open  # start and open in browser
npm run build        # production build (static, output in build/)
npm run preview      # preview production build
npm run check        # svelte-check / type checking
npm run format       # prettier --write
npm run lint         # prettier --check
```

---

## Configuration

Copy `.env.example` to `.env` and set the values before running the app:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PLANTS_API_URL` | Plants API endpoint, e.g. `https://your-plants-api-host/api/plants`. Used **only by the Vite dev server** to proxy `/api/*` during local development (only its origin is read — see [vite.config.ts](vite.config.ts)). In production the site and API share an origin, so the browser calls `/api/*` directly and this is not needed. |

---

## Client data layer

The browser talks to the plants API through [src/lib/api/plants.ts](src/lib/api/plants.ts), which exposes three operations built on the backend's two endpoints — `GET /api/plants` (list) and `GET /api/plants/:id` (detail). There is no dedicated search endpoint; name search is composed client-side from list queries.

### `fetchCandidatePlants(params, signal?) → PlantSummary[]`

Every plant appropriate for a location. The backend caps each response at 250 records, so this pages through `GET /api/plants` in batches of 250 (incrementing `offset`) until a short page, then trims each record to the [PlantSummary](#plantsummary) shape. `params` carries the location and any filters:

| Parameter   | Type    | Description |
|-------------|---------|-------------|
| `ecoregion` | string  | EPA Level III ecoregion code (e.g. `"9.4.1"`). |
| `zone`      | string  | USDA Plant Hardiness Zone label (e.g. `"7b"`). |
| `zipcode`   | string  | US ZIP code. |

Plus any of the [filter parameters](#filter-parameters) below. `limit` and `offset` are managed internally by the pager.

### `searchPlants(term, location?, signal?) → PlantSearchResult[]`

Name search. Queries `GET /api/plants` twice — once by `scientific_name` and once by `common_name` — and returns the de-duplicated union as [PlantSearchResult](#plantsearchresult) objects. When a `location` (`zipcode`, `ecoregion`, and/or `zone`) is supplied, it runs the pair of queries a second time with the location filter applied and sets each result's `appropriate` flag accordingly; with no location, `appropriate` is `null`. A blank `term` returns `[]`.

### `fetchPlantDetail(id, signal?) → Plant`

The full record for a single plant via `GET /api/plants/:id`, as a [Plant](#plant) object. Throws when the backend returns a non-2xx status.

---

## Filter parameters

`fetchCandidatePlants` forwards these filter parameters to the API when present (built from the filter state by `applyPlantFilterParams` in [src/lib/plant-filters.ts](src/lib/plant-filters.ts)):

`plant_type`, `sun_and_shade`, `soil_moisture`, and the boolean wildlife flags `monarchs`, `native_bees`, `honey_bees`, `bombus`, `butterflies`, `moths`, `hummingbirds`, `beetles_wasps_flies`, `bats`, `nesting_and_structure_bees`, `larval_host_monarch`, `larval_host_butterfly`, `larval_host_moth`.

The UI offers a canonical set of option values defined in [src/lib/plant-filters.ts](src/lib/plant-filters.ts) (these mirror the distinct values the API returns, so they can be shown before a location is chosen):

| Filter          | Param            | Options |
|-----------------|------------------|---------|
| Plant type      | `plant_type`     | `Cactus`, `Fern`, `Grass`, `Grass-like`, `Herb`, `Shrub`, `Subshrub`, `Succulent`, `Tree`, `Vine` |
| Sun & shade     | `sun_and_shade`  | `Sun`, `Part-shade`, `Shade` |
| Soil moisture   | `soil_moisture`  | `Dry`, `Moist`, `Wet` |
| Wildlife value  | (boolean flags)  | Set the relevant flag(s) above to `true`. |

---

## Data Dictionary

Types are defined in [src/lib/types/plant.ts](src/lib/types/plant.ts). `fetchCandidatePlants` and `searchPlants` return a trimmed **summary** shape; `fetchPlantDetail` returns the fuller **Plant** shape.

### PlantSummary

Returned by `fetchCandidatePlants`. The client trims API records to these keys (`SUMMARY_KEYS` in [src/lib/api/plants.ts](src/lib/api/plants.ts)).

| Field             | Type           | Description |
|-------------------|----------------|-------------|
| `id`              | `string`       | Unique identifier. |
| `name`            | `string`       | Display name. |
| `scientific_name` | `string?`      | Botanical (Latin) name. |
| `common_name`     | `string[]`     | One or more common names. |
| `image_url`       | `string?`      | URL of a representative image. |
| `images`          | `PlantImage[]?`| Ordered list of images (see [PlantImage](#plantimage)). |
| `plant_type`      | `string[]?`    | Plant categories (e.g. `"Tree"`, `"Shrub"`). |
| `sun_and_shade`   | `string[]?`    | Light requirements (`"Sun"`, `"Part-shade"`, `"Shade"`). |
| `soil_moisture`   | `string[]?`    | Soil moisture needs (`"Dry"`, `"Moist"`, `"Wet"`). |
| Wildlife flags    | `boolean?`     | `monarchs`, `native_bees`, `honey_bees`, `bombus`, `butterflies`, `moths`, `hummingbirds`, `beetles_wasps_flies`, `bats`, `nesting_and_structure_bees`, `larval_host_monarch`, `larval_host_butterfly`, `larval_host_moth`. |

### PlantSearchResult

Returned by `searchPlants`. Extends [PlantSummary](#plantsummary) with:

| Field         | Type             | Description |
|---------------|------------------|-------------|
| `appropriate` | `boolean \| null`| Whether the plant suits the supplied location. `null` when no location was provided. |

### Plant

Returned by `fetchPlantDetail`. Extends [PlantSummary](#plantsummary) with:

| Field              | Type        | Description |
|--------------------|-------------|-------------|
| `plant_family`     | `string?`   | Plant family (e.g. `"Asteraceae"`). |
| `height_min_ft`    | `number?`   | Minimum mature height in feet. |
| `height_max_ft`    | `number?`   | Maximum mature height in feet. |
| `growth_rate`      | `string?`   | Growth rate category. |
| `lifespan`         | `string[]?` | e.g. `"Annual"`, `"Biennial"`, `"Perennial"`. |
| `flowering_months` | `string[]?` | Months in which the plant flowers (e.g. `["May", "June"]`). |

### PlantImage

| Field             | Type      | Description |
|-------------------|-----------|-------------|
| `img_file_name`   | `string`  | Image file name. |
| `img_src_url`     | `string?` | Source URL of the image. |
| `img_attribution` | `string?` | Attribution / credit string. |

---

## Geospatial data & services

### Geocoding — [src/lib/services/geocoding.ts](src/lib/services/geocoding.ts)

`GeocodingService` calls the OpenStreetMap **Nominatim** API directly from the browser for forward (`searchLocation`) and reverse (`reverseGeocode`) geocoding. Requests are throttled to one per second and limited to the US (`countrycodes=us`). A forward search requires a 5-digit (or ZIP+4) US ZIP code in the query.

### Spatial analysis — [src/lib/services/spatial-analysis.ts](src/lib/services/spatial-analysis.ts)

`SpatialAnalysisService.analyzePoint` loads the selected layer GeoJSON (converting TopoJSON if needed), runs a Turf `booleanPointInPolygon` test for a `[lon, lat]` point, and returns the first containing polygon's allowed properties per layer (allowed fields come from `properties.json`). Layer GeoJSON is cached after first fetch.

### USDA Plant Hardiness Zones (PHZ)

Source shapefile: `static/shapefiles/plant-hardiness-zones/`
Processed GeoJSON: `static/geodata/phz.geojson` / `static/geodata/phz.json`

| Field       | Description |
|-------------|-------------|
| `Id`        | Internal record identifier. |
| `gridcode`  | Numeric grid code corresponding to the zone. |
| `zone`      | Zone label (e.g. `"7b"`). Used as the `zone` query parameter. |
| `trange`    | Average annual extreme minimum temperature range for this zone (°F). |
| `zonetitle` | Full human-readable zone title. |

**Source:** [USDA Agricultural Research Service — Plant Hardiness Zone Map (2023)](https://planthardiness.ars.usda.gov/)

### EPA Level III Ecoregions

Source shapefile: `static/shapefiles/ecoregions/`
Processed GeoJSON: `static/geodata/ecoregions.geojson` / `static/geodata/ecoregions.json`

| Field        | Description |
|--------------|-------------|
| `US_L3CODE`  | US Level III ecoregion code. Used as the `ecoregion` query parameter. |
| `US_L3NAME`  | US Level III ecoregion name. |
| `NA_L3CODE`  | North American Level III ecoregion code. |
| `NA_L3NAME`  | North American Level III ecoregion name. |
| `NA_L2CODE`  | North American Level II ecoregion code (parent of Level III). |
| `NA_L2NAME`  | North American Level II ecoregion name. |
| `NA_L1CODE`  | North American Level I ecoregion code (broadest classification). |
| `NA_L1NAME`  | North American Level I ecoregion name. |
| `L3_KEY`     | Composite key: `NA_L3CODE` + `US_L3NAME`. |
| `L2_KEY`     | Composite key: `NA_L2CODE` + `NA_L2NAME`. |
| `L1_KEY`     | Composite key: `NA_L1CODE` + `NA_L1NAME`. |
| `Shape_Leng` | Perimeter length of the polygon (map units). |
| `Shape_Area` | Area of the polygon (map units). |

**Source:** [US EPA Level III and IV Ecoregions](https://www.epa.gov/eco-research/level-iii-and-iv-ecoregions-continental-united-states)

---

## Static data files

| File | Description |
|------|-------------|
| `static/layers-list.json` | Available map overlay layers (name, GeoJSON path, description). Loaded by `+page.ts`. |
| `static/properties.json` | Allowed attribute field names per layer (`phz`, `ecoregions`), used to filter polygon properties. |
| `static/geodata/phz.json` / `phz.geojson` | Processed PHZ feature data served to the browser. |
| `static/geodata/ecoregions.json` / `ecoregions.geojson` | Processed ecoregion feature data served to the browser. |
| `static/geodata-big/` | Full-resolution GeoJSON (used for processing; not loaded by the app). |
| `static/img/splash.jpg` | Splash / landing image. |
