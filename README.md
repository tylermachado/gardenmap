# MyNativePlantList

A SvelteKit map application (package name `MyNativePlantList`) for discovering native plants suited to a US location. Pick a spot on the map or search a ZIP code to see the plant-hardiness zone and ecoregion you land in, browse the plants appropriate for that location, filter them, and check whether a specific plant by name is a good fit.

Built with SvelteKit (Svelte 5 runes), Leaflet for the map, Turf.js for point-in-polygon lookups, and Tailwind CSS. It ships as a static site via `@sveltejs/adapter-static`.

---

## How it works

The app has two complementary flows, both driven from the home page ([src/routes/+page.svelte](src/routes/+page.svelte)):

- **Location → plants.** Clicking the map or searching a ZIP code geocodes the point (client-side, via Nominatim), resolves which hardiness zone / ecoregion polygon contains it (client-side, via Turf), and fetches the plants appropriate for that location.
- **Plant name → suitability.** Searching by plant name lists catalog matches and, once a location is set, annotates each match with whether it suits that location.

Geocoding and the polygon lookup happen in the browser against bundled GeoJSON. Plant data is fetched through SvelteKit server routes under `/api/plants/*`, which proxy an upstream plants API configured by `PLANTS_API_URL`.

---

## Project structure

```
src/
  routes/
    +page.svelte                  # Home page; orchestrates map, search, filters, results
    +page.ts                      # Loads layers-list.json and properties.json
    api/plants/
      +server.ts                  # GET /api/plants — location-filtered candidate list
      search/+server.ts           # GET /api/plants/search — name search + suitability
      [id]/+server.ts             # GET /api/plants/:id — full plant detail
  lib/
    components/                   # Map, SearchBar, LocationInfo, CandidatePlants,
                                  #   PlantFilters, PlantModal, PlantSearchResults, InfoModal
    server/plants.ts              # Server-only upstream helpers (toSummary, SUMMARY_KEYS)
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
| `PLANTS_API_URL` | Base URL of the upstream plants API (no trailing slash), e.g. `http://your-plants-api-host:8000/plants`. Imported via `$env/static/private` and consumed by every route under `src/routes/api/plants/`. |

---

## API Reference

All three endpoints are SvelteKit server routes that proxy the upstream plants API. On failure they return `{ "error": "..." }` with a non-2xx status.

### `GET /api/plants`

Returns every plant appropriate for a location, as a JSON array of [PlantSummary](#plantsummary) objects. The handler ([src/routes/api/plants/+server.ts](src/routes/api/plants/+server.ts)) pages through the upstream API in batches of 250 until exhausted, so the full result set is returned in one response — there is no client-controlled page size.

#### Query parameters

| Parameter   | Type    | Default | Description |
|-------------|---------|---------|-------------|
| `ecoregion` | string  | —       | EPA Level III ecoregion code (e.g. `"9.4.1"`). Forwarded to the upstream API. |
| `zone`      | string  | —       | USDA Plant Hardiness Zone label (e.g. `"7b"`). Forwarded to the upstream API. |
| `zipcode`   | string  | —       | US ZIP code. Forwarded to the upstream API. |
| `offset`    | integer | `0`     | Starting offset for upstream pagination. The handler keeps fetching subsequent pages from here. |

Plus any of the [filter parameters](#filter-parameters) below. `limit` is fixed at `250` internally and is not a client parameter.

#### Example

```
GET /api/plants?zone=7b&plant_type=Tree&monarchs=true
```

Returns a JSON array of [PlantSummary](#plantsummary) objects.

---

### `GET /api/plants/search`

Name search ([src/routes/api/plants/search/+server.ts](src/routes/api/plants/search/+server.ts)). For a search term it queries the upstream API by both `scientific_name` and `common_name` and returns the de-duplicated union as [PlantSearchResult](#plantsearchresult) objects.

When location parameters are supplied, the handler runs the search a second time with the location filter applied and sets each result's `appropriate` flag accordingly. With no location, `appropriate` is `null`.

#### Query parameters

| Parameter   | Type   | Description |
|-------------|--------|-------------|
| `q`         | string | Search term, matched against scientific and common names. An empty/blank term returns `[]`. |
| `zipcode`   | string | Optional location filter used to compute `appropriate`. |
| `ecoregion` | string | Optional location filter used to compute `appropriate`. |
| `zone`      | string | Optional location filter used to compute `appropriate`. |

#### Example

```
GET /api/plants/search?q=milkweed&zipcode=97201
```

---

### `GET /api/plants/:id`

Returns the full record for a single plant ([src/routes/api/plants/[id]/+server.ts](src/routes/api/plants/[id]/+server.ts)), as a [Plant](#plant) object. Proxies straight through to the upstream API by id; returns `{ "error": "Plant not found" }` when the upstream returns a non-2xx status.

---

## Filter parameters

The list endpoint forwards these filter parameters to the upstream API when present (`FILTER_PARAMS` in [src/routes/api/plants/+server.ts](src/routes/api/plants/+server.ts)):

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

Types are defined in [src/lib/types/plant.ts](src/lib/types/plant.ts). The list and search endpoints return a trimmed **summary** shape; the detail endpoint returns the fuller **Plant** shape.

### PlantSummary

Returned by `GET /api/plants`. The server trims upstream records to these keys (`SUMMARY_KEYS` in [src/lib/server/plants.ts](src/lib/server/plants.ts)).

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

Returned by `GET /api/plants/search`. Extends [PlantSummary](#plantsummary) with:

| Field         | Type             | Description |
|---------------|------------------|-------------|
| `appropriate` | `boolean \| null`| Whether the plant suits the supplied location. `null` when no location was provided. |

### Plant

Returned by `GET /api/plants/:id`. Extends [PlantSummary](#plantsummary) with:

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
