# WFF Prototype

A SvelteKit map application for exploring native plant species by geographic region, ecoregion, and plant hardiness zone.

---

## Development

```bash
npm install
npm run dev          # start dev server
npm run dev -- --open  # start and open in browser
npm run build        # production build
npm run preview      # preview production build
```

---

## Configuration

Copy `.env.example` to `.env` and set the values before running the app:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PLANTS_API_URL` | Base URL of the upstream plants API (no trailing slash). Consumed by `src/routes/api/plants/+server.ts`. |

---

## API Reference

### `GET /api/plants`

Proxy endpoint for the upstream plants API. Returns a list of plant records filtered by the provided geographic identifiers.

**Base URL (upstream):** configured via the `PLANTS_API_URL` environment variable (see [Configuration](#configuration))

#### Query Parameters

The SvelteKit proxy currently forwards the following parameters to the upstream API:

| Parameter   | Type    | Default | Constraints       | Description |
|-------------|---------|---------|-------------------|-------------|
| `ecoregion` | string  | —       | —                 | EPA Level III ecoregion code (e.g. `"9.4.1"`). Filters plants native to this ecoregion. |
| `zone`      | string  | —       | —                 | USDA Plant Hardiness Zone label (e.g. `"7b"`). Filters plants hardy in this zone. |
| `zipcode`   | string  | —       | pattern `^\d{5}$` | US ZIP code. Used as an alternative or supplement to `ecoregion`/`zone`. |
| `offset`    | integer | `0`     | min `0`           | Pagination offset. |
| `limit`     | integer | `250`   | `1`–`250`         | Fixed at `250` by the proxy; not exposed as a client parameter. |

The upstream API supports additional filter parameters that are not yet forwarded by the proxy. See [Upstream Filter Parameters](#upstream-filter-parameters) below.

#### Example Request

```
GET /api/plants?ecoregion=9.4.1&zone=7b
```

#### Response

Returns a JSON array of [Plant](#plant) objects, or an error object on failure.

**Success — `200 OK`:** JSON array of [Plant](#plant) objects.

**Error — `500 Internal Server Error`**

```json
{ "error": "Description of what went wrong" }
```

---

### Upstream Filter Parameters

These query parameters are supported by the upstream API (the URL configured via `PLANTS_API_URL`) but are not yet forwarded by the SvelteKit proxy. They can be added to `src/routes/api/plants/+server.ts` as needed.

#### Identification

| Parameter         | Type   | Constraints    | Description |
|-------------------|--------|----------------|-------------|
| `scientific_name` | string | max 100 chars  | Partial match on scientific name. |
| `common_name`     | string | max 100 chars  | Partial match on any common name (array search). |
| `plant_family`    | string | max 100 chars  | Filter by plant family. |
| `plant_type`      | string | max 100 chars  | Filter by plant type (array search, e.g. `Tree`, `Shrub`, `Forb/Herb`). |

#### Physical Characteristics

| Parameter            | Type    | Constraints     | Description |
|----------------------|---------|-----------------|-------------|
| `height_min_ft`      | number  | `0`–`500`       | Minimum mature height in feet. |
| `height_max_ft`      | number  | `0`–`500`       | Maximum mature height in feet. |
| `showy`              | boolean | —               | Has showy flowers. |
| `flower_colors`      | string  | max 25 chars    | Filter by flower color (array search). |
| `fall_color`         | string  | max 25 chars    | Filter by fall foliage color. |
| `evergreen_deciduous`| string  | `Evergreen`, `Deciduous` | Leaf retention behavior. |
| `growth_rate`        | string  | `Slow`, `Moderate`, `Rapid` | Growth rate category. |
| `lifespan`           | string  | `Annual`, `Biennial`, `Perennial` | Plant lifespan (array search). |
| `duration`           | string  | `Long`, `Moderate`, `Short` | Duration category. |
| `flowering_months`   | string  | Month name (e.g. `June`) | Filter by a flowering month (array search). |

#### Growing Conditions

| Parameter           | Type   | Constraints              | Description |
|---------------------|--------|--------------------------|-------------|
| `sun_and_shade`     | string | `Shade`, `Part-Shade`, `Sun` | Light requirement (array search). |
| `soil_moisture`     | string | `Dry`, `Moist`, `Wet`    | Soil moisture requirement (array search). |
| `drought_tolerance` | string | `None`, `Low`, `Medium`, `High` | Drought tolerance level. |
| `salt_tolerance`    | string | `None`, `Low`, `Medium`, `High` | Salt tolerance level. |
| `fire_tolerance`    | string | `None`, `Low`, `Medium`, `High` | Fire tolerance level. |
| `ph_min`            | number | `0`–`14`                 | Minimum soil pH. |
| `ph_max`            | number | `0`–`14`                 | Maximum soil pH. |

#### Wildlife Value

| Parameter                  | Type    | Description |
|----------------------------|---------|-------------|
| `monarchs`                 | boolean | Attracts monarch butterflies. |
| `native_bees`              | boolean | Attracts native bees. |
| `honey_bees`               | boolean | Attracts honey bees. |
| `bombus`                   | boolean | Attracts bumblebees. |
| `butterflies`              | boolean | Attracts butterflies. |
| `moths`                    | boolean | Attracts moths. |
| `hummingbirds`             | boolean | Attracts hummingbirds. |
| `beetles_wasps_flies`      | boolean | Attracts beetles, wasps, or flies. |
| `bats`                     | boolean | Attracts bats. |
| `nesting_and_structure_bees` | boolean | Provides nesting structure for bees. |
| `larval_host_monarch`      | boolean | Serves as larval host for monarchs. |
| `larval_host_butterfly`    | boolean | Serves as larval host for butterflies. |
| `larval_host_moth`         | boolean | Serves as larval host for moths. |

---

## Data Dictionary

### Plant

Represents a single plant record returned by `/api/plants`.

#### Identification

| Field             | Type       | Description |
|-------------------|------------|-------------|
| `id`              | `string`   | Unique identifier for the plant record. |
| `name`            | `string`   | Display name. |
| `scientific_name` | `string`   | Botanical (Latin) name. |
| `common_name`     | `string[]` | One or more common names. |
| `plant_family`    | `string`   | Plant family (e.g. `"Asteraceae"`). |
| `plant_type`      | `string[]` | Plant categories (e.g. `"Tree"`, `"Shrub"`, `"Forb/Herb"`). |
| `image_url`       | `string`   | URL of a representative plant image. |

#### Physical Characteristics

| Field                 | Type       | Description |
|-----------------------|------------|-------------|
| `height_min_ft`       | `number`   | Minimum mature height in feet. |
| `height_max_ft`       | `number`   | Maximum mature height in feet. |
| `showy`               | `boolean`  | Has showy flowers. |
| `flower_colors`       | `string[]` | Flower colors. |
| `fall_color`          | `string`   | Fall foliage color. |
| `evergreen_deciduous` | `string`   | `"Evergreen"` or `"Deciduous"`. |
| `growth_rate`         | `string`   | `"Slow"`, `"Moderate"`, or `"Rapid"`. |
| `lifespan`            | `string[]` | `"Annual"`, `"Biennial"`, and/or `"Perennial"`. |
| `duration`            | `string`   | `"Long"`, `"Moderate"`, or `"Short"`. |
| `flowering_months`    | `string[]` | Months in which the plant flowers (e.g. `["May", "June"]`). |

#### Growing Conditions

| Field                | Type       | Description |
|----------------------|------------|-------------|
| `sun_and_shade`      | `string[]` | Light requirements: `"Shade"`, `"Part-Shade"`, `"Sun"`. |
| `soil_moisture`      | `string[]` | Soil moisture needs: `"Dry"`, `"Moist"`, `"Wet"`. |
| `drought_tolerance`  | `string`   | `"None"`, `"Low"`, `"Medium"`, or `"High"`. |
| `salt_tolerance`     | `string`   | `"None"`, `"Low"`, `"Medium"`, or `"High"`. |
| `fire_tolerance`     | `string`   | `"None"`, `"Low"`, `"Medium"`, or `"High"`. |
| `ph_min`             | `number`   | Minimum soil pH (0–14). |
| `ph_max`             | `number`   | Maximum soil pH (0–14). |

#### Wildlife Value

| Field                        | Type      | Description |
|------------------------------|-----------|-------------|
| `monarchs`                   | `boolean` | Attracts monarch butterflies. |
| `native_bees`                | `boolean` | Attracts native bees. |
| `honey_bees`                 | `boolean` | Attracts honey bees. |
| `bombus`                     | `boolean` | Attracts bumblebees. |
| `butterflies`                | `boolean` | Attracts butterflies. |
| `moths`                      | `boolean` | Attracts moths. |
| `hummingbirds`               | `boolean` | Attracts hummingbirds. |
| `beetles_wasps_flies`        | `boolean` | Attracts beetles, wasps, or flies. |
| `bats`                       | `boolean` | Attracts bats. |
| `nesting_and_structure_bees` | `boolean` | Provides nesting structure for bees. |
| `larval_host_monarch`        | `boolean` | Serves as larval host for monarchs. |
| `larval_host_butterfly`      | `boolean` | Serves as larval host for butterflies. |
| `larval_host_moth`           | `boolean` | Serves as larval host for moths. |

---

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

---

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

## Static Data Files

| File | Description |
|------|-------------|
| `static/layers-list.json` | List of available map overlay layers with display names, file paths, and descriptions. |
| `static/properties.json` | Lists attribute field names for each shapefile dataset (`phz`, `ecoregions`). |
| `static/geodata/phz.json` | Processed PHZ topology/feature data (browser-optimized). |
| `static/geodata/ecoregions.json` | Processed ecoregion topology/feature data (browser-optimized). |
| `static/geodata-big/` | Full-resolution GeoJSON files (not served to browser; used for processing). |

---

## TODO / Open Questions

- [ ] Verify all response field names and types against actual API responses (schema above is inferred from query param names).
- [ ] Clarify how `zipcode` is resolved upstream — is it used to derive `ecoregion`/`zone`, or filtered directly?
- [ ] Expose additional upstream filter parameters in the proxy as UI filtering needs grow.
- [ ] Add upstream API authentication requirements if/when credentials are needed.
- [ ] Confirm complete set of `plant_type` enum values.
