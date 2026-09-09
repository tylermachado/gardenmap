# MyNativePlantList

A SvelteKit map application (package name `MyNativePlantList`) for discovering native plants suited to a US location. Pick a spot on the map or search a ZIP code to see the plant-hardiness zone and ecoregion you land in, browse the plants appropriate for that location, filter them, and check whether a specific plant by name is a good fit.

Built with SvelteKit (Svelte 5 runes), Leaflet for the map, and Tailwind CSS. It ships as a static site via `@sveltejs/adapter-static`.

---

## How it works

The app has two complementary flows, both driven from the home page ([src/routes/+page.svelte](src/routes/+page.svelte)):

- **Location → plants.** Clicking the map or searching a ZIP code resolves a ZIP (via the mynativeplantlist ZIP API, plus a bundled centroid table for placing the pin). That same ZIP response carries the location's hardiness zone, ecoregion and state, which are shown in the info panel *and* used to fetch the plants appropriate for it.
- **Plant name → suitability.** Searching by plant name lists catalog matches and, once a location is set, annotates each match with whether it suits that location.

The ZIP endpoint is the single source of a location's zone, ecoregion and state — the map polygons are drawn for display only and are never read to identify a location. Plant data is fetched directly from the browser via [src/lib/api/plants.ts](src/lib/api/plants.ts), which calls the plants API at the same-origin path `/api/plants/*`. In production the site and the API share an origin (`mynativeplantlist.com/api/...`), so these calls need no CORS; in local development the Vite dev server proxies `/api/*` to the API origin given by `PLANTS_API_URL` (see [vite.config.ts](vite.config.ts)).

---

## Project structure

```
src/
  routes/
    +page.svelte                  # Home page; orchestrates map, search, filters, results
    +page.ts                      # Loads layers-list.json
  lib/
    api/plants.ts                 # Browser client for the plants API: candidate list
                                  #   (paged), name search + suitability, detail, summary
    components/                   # Map, SearchBar, LocationInfo, CandidatePlants,
                                  #   PlantFilters, PlantModal, PlantSearchResults, InfoModal
    services/geocoding.ts         # mynativeplantlist ZIP geocoding: address, ecoregion,
                                  #   hardiness zone + bundled ZIP centroids (US-only)
    ecoregions.ts                 # Level I/II names for a Level III ecoregion code
    hardiness.ts                  # Temperature band for a whole hardiness zone
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
| `ecoregion` | string  | North American Level III ecoregion code, as reported by `GET /api/zip/{zipcode}` (e.g. `"9.4.1"`). |
| `hardiness_zone` | string | USDA Plant Hardiness Zone as a bare integer (e.g. `"7"`). The API returns **400** for `"7b"`. |
| `state`     | string  | Full state name, e.g. `"Connecticut"`. Abbreviations return no results. |

Plus any of the [filter parameters](#filter-parameters) below. `limit` and `offset` are managed internally by the pager.

### How a point is matched — `locationParams(location)`

A location is matched on **ecoregion + hardiness zone + state**, all three taken from one `GET /api/zip/{zipcode}` response. [`locationParams`](src/lib/api/plants.ts) in the API client is the single source of that rule; both the candidate list and the plant-name suitability check go through it.

> **The API only honours `state` when both `ecoregion` and `hardiness_zone` are also present.** Sent with a partial set it is silently dropped and the response is over-broad (verified: `hardiness_zone=6&state=Florida` returns the same 473 records as `hardiness_zone=6` alone). So `state` is only ever sent as part of the complete triple.

| Input | Query sent |
|---|---|
| `ecoregion` + `zone` + `state` | `ecoregion` + `hardiness_zone` + `state` |
| Any of the three missing | **nothing** — no query is made |

Because the three values arrive together, an incomplete set is an error rather than a degraded mode: every recognised ZIP resolves all three. `zipcode` is carried on `PlantLocation` as the location's identity but is never sent as a query parameter — querying by ZIP could return a different answer than the one the info panel is displaying, which is exactly the divergence this design removes.

### `searchPlants(term, location?, signal?) → PlantSearchResult[]`

Name search. Queries `GET /api/plants` twice — once by `scientific_name` and once by `common_name` — and returns the de-duplicated union as [PlantSearchResult](#plantsearchresult) objects. When a `location` ([`PlantLocation`](src/lib/api/plants.ts), resolved through the same `locationParams` rule above) is supplied, it runs the pair of queries a second time with the location filter applied and sets each result's `appropriate` flag accordingly; with no location, `appropriate` is `null`. A blank `term` returns `[]`.

### `fetchPlantDetail(id, signal?) → Plant`

The full record for a single plant via `GET /api/plants/:id`, as a [Plant](#plant) object. Throws when the backend returns a non-2xx status.

---

## Filter parameters

`fetchCandidatePlants` forwards these filter parameters to the API when present (built from the filter state by `applyPlantFilterParams` in [src/lib/plant-filters.ts](src/lib/plant-filters.ts)):

`plant_type`, `sun_and_shade`, `soil_moisture`, and the boolean wildlife flags `monarchs`, `native_bees`, `honey_bees`, `bombus`, `butterflies`, `moths`, `hummingbirds`, `beetles_wasps_flies`, `bats`, `nesting_and_structure_bees`, `larval_host_monarch`, `larval_host_butterfly`, `larval_host_moth`.

The UI offers a canonical set of option values defined in [src/lib/plant-filters.ts](src/lib/plant-filters.ts) (these mirror the distinct values the API returns, so they can be shown before a location is chosen):

| Filter          | Param            | Options |
|-----------------|------------------|---------|
| Plant type      | `plant_type`     | `Cactus`, `Fern`, `Grass`, `Grass-like`, `Perennial`, `Shrub`, `Subshrub`, `Succulent`, `Tree`, `Vine` |
| Sun & shade     | `sun_and_shade`  | `Sun`, `Part-Shade`, `Shade` |
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
| `sun_and_shade`   | `string[]?`    | Light requirements (`"Sun"`, `"Part-Shade"`, `"Shade"`). |
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

Geocoding uses mynativeplantlist's `/api/zip` endpoints plus a bundled ZIP centroid table.

`GeocodingService.reverseGeocode` (used for map clicks and "use my location") calls `GET /api/zip?longitude=&latitude=` to map a point to a ZIP code (Census Bureau data, either a `"contains"` match or the `"nearest"` known ZIP). It returns `null` when the point isn't in a US ZIP area, so off-map clicks are ignored.

`GeocodingService.searchLocation` (forward ZIP-text search) resolves a typed ZIP to coordinates against [static/geodata/zip-centroids.json](static/geodata/zip-centroids.json), fetched once and cached in memory. A search requires a 5-digit (or ZIP+4) US ZIP code in the query.

**Non-ZCTA ZIPs.** PO-box-only, military, and single-organization ZIPs cover no land area, so they have no centroid of their own — `89222` (Nellis AFB) and `12345` (General Electric, Schenectady) are examples. `GET /api/zip/{zipcode}` reports a `matched_zip` for those, a nearby ZIP it substituted, and `searchLocation` uses that ZIP's centroid. The typed ZIP stays as the result's `postcode` either way.

A ZIP resolves into one of three states:

| | Result |
|---|---|
| Has a centroid, directly or via `matched_zip` | Full location: marker, map view, `?lat=&lng=` in the URL |
| Recognised by the API but no centroid either way | Location **without a pin** — no marker and no coords in the URL, but city/state, zone, ecoregion and plant results are all unaffected |
| Not recognised by the API at all | Throws a message naming the ZIP |

The pin-less state exists because a ZIP like `00501` is a real place the app simply can't put on a map; dropping the search entirely would be worse than showing it un-pinned. `searchLocation` signals it by returning `lat`/`lon` as `null`.

Two consequences of deferring to the API's substitution are worth knowing:

- **The API answers for any 5-digit string** — `00000` returns "Mt Meadows Area, California" — so typos resolve to real-looking places instead of erroring. In practice the third row above is unreachable for well-formed input, and there is no client-side validation of whether a ZIP genuinely exists.
- **A few substitutions cross state lines**: `00801` (US Virgin Islands) resolves to Agawam, Massachusetts, and `45999` (IRS Cincinnati, OH) to Alexandria, Indiana. These are backend matching issues; the client has no independent read on where an area-less ZIP sits.

Both paths then call `GET /api/zip/{zipcode}` and build their result through the same helper, so a given ZIP always renders the same place whether it was clicked or typed. That one response supplies the town/state *and* the `hardiness_zone` / `ecoregions` used for both the info panel and the plant query. State abbreviations are expanded to full names by [toFullStateName](src/lib/utils/usStates.ts).

**Why the endpoint, not the polygons.** The panel used to read the hardiness zone and ecoregion out of the map polygons under the pin, while the backend matched plants on its own ZIP data — so the two could describe different places. `01093` is the clearest case: it has no ZCTA of its own, the API substitutes `matched_zip: "01092"` about 30 miles east, and the pin therefore landed in a different ecoregion polygon (`5.3.1`) than the one the API resolved (`8.1.7`). Reading both the display and the query off the single ZIP response makes that class of mismatch impossible.

**The `environment` field.** `SearchResult.environment` ([ZipEnvironment](src/lib/types/layer.ts)) carries `hardinessZone`, `ecoregionCode` and `ecoregionName`. Every recognised ZIP resolves all three of ecoregion, zone and state, so `null` is an error state, not a normal one: it is logged with `console.error`, the info panel says the location is unavailable, and no plant query is made. `ecoregions` comes back as a list; the first entry is the one used, since a ZIP matches plants against a single ecoregion.

**ZIP centroid table.** [static/geodata/zip-centroids.json](static/geodata/zip-centroids.json) (~890 KB, ~290 KB gzipped) maps 33,791 ZIPs to `[lat, lon]` at 4-decimal precision. The coordinates are ZCTA *internal points* from the [2024 US Census Gazetteer](https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html) — guaranteed to fall inside the ZIP's own polygon rather than being true centroids, so each one round-trips back through `/api/zip` to the same ZIP and lands in the correct hardiness-zone and ecoregion polygon. Rebuild it from the Gazetteer's `GEOID`/`INTPTLAT`/`INTPTLONG` columns when refreshing to a newer vintage.

### Ecoregion levels — [src/lib/ecoregions.ts](src/lib/ecoregions.ts)

The ZIP endpoint returns only the Level III ecoregion code and name, but the info panel shows all three levels. `resolveEcoregionLevels` looks the code up in [src/lib/data/ecoregion-levels.json](src/lib/data/ecoregion-levels.json), an 84-entry table of Level I/II/III codes and names generated from the bundled `static/geodata/ecoregions.json` layer. Regenerate it from that layer's `NA_L*CODE` / `NA_L*NAME` properties when the ecoregion data is refreshed.

The API's code is always the authority; the table only supplies labels for it. Its Level III name also wins over the endpoint's, because some names come back truncated (`8.3.1` is returned as `"Northern Piedmon"`). A code missing from the table still renders — Level I and II codes are derived by splitting (`8.1.7` → `8`, `8.1`), with the endpoint's own name used for Level III.

### Hardiness zone display — [src/lib/hardiness.ts](src/lib/hardiness.ts)

The endpoint reports the zone as a bare integer (`6`), never a half-zone (`6b`), so the panel shows the integer — the same value sent to the plants API. `zoneTempRange` derives the temperature band from it arithmetically (each zone spans 10°F from -60°F at zone 1) rather than reading a polygon's `trange`, which is why the panel shows zone 6 as `-10 to 0°F` rather than a half-zone's narrower band.

### USDA Plant Hardiness Zones (PHZ)

Source shapefile: `static/shapefiles/plant-hardiness-zones/`
Processed GeoJSON: `static/geodata/phz.geojson` / `static/geodata/phz.json`

| Field       | Description |
|-------------|-------------|
| `Id`        | Internal record identifier. |
| `gridcode`  | Numeric grid code corresponding to the zone. |
| `zone`      | Zone label (e.g. `"7b"`). Map display only — the queried zone comes from the ZIP endpoint. |
| `trange`    | Average annual extreme minimum temperature range for this zone (°F). |
| `zonetitle` | Full human-readable zone title. |

**Source:** [USDA Agricultural Research Service — Plant Hardiness Zone Map (2023)](https://planthardiness.ars.usda.gov/)

### EPA Level III Ecoregions

Source shapefile: `static/shapefiles/ecoregions/`
Processed GeoJSON: `static/geodata/ecoregions.geojson` / `static/geodata/ecoregions.json`

| Field        | Description |
|--------------|-------------|
| `US_L3CODE`  | US Level III ecoregion code (e.g. `"1"`). |
| `US_L3NAME`  | US Level III ecoregion name. |
| `NA_L3CODE`  | North American Level III ecoregion code (e.g. `"7.1.8"`). Map display only; the queried ecoregion comes from the ZIP endpoint. Also the key of the generated [ecoregion-levels.json](src/lib/data/ecoregion-levels.json) table. |
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
| `static/geodata/phz.json` / `phz.geojson` | Processed PHZ feature data served to the browser. |
| `static/geodata/ecoregions.json` / `ecoregions.geojson` | Processed ecoregion feature data served to the browser. |
| `static/geodata-big/` | Full-resolution GeoJSON (used for processing; not loaded by the app). |
| `static/img/splash.jpg` | Splash / landing image. |
