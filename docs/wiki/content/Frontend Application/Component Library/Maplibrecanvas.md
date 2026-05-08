```markdown
# MapLibreCanvas.tsx

## Overview

`MapLibreCanvas.tsx` is a React component responsible for rendering and managing the interactive map using the MapLibre GL library. It provides the core functionality for displaying map tiles, user location, traffic data, safe spaces, and other relevant information for the SafeVixAI platform. The component handles map initialization, layer management, and interaction with various features like location tracking and route visualization.

## Architecture

This component resides within the frontend application's component library. It serves as a central hub for map-related functionalities, interacting with other modules for data fetching, location tracking, and layer rendering. It leverages MapLibre GL for map rendering and integrates with external services for map styles and data sources. It is a child component, rendered within the `app` directory of the Next.js application. It receives data from parent components and dispatches actions to update the map's state.

## Key Classes/Functions

| Name | Parameters | Return | Description |
|---|---|---|---|
| `buildMapTilerRasterStyle(tileUrl: string)` | `tileUrl: string` | `object` | Constructs a MapLibre style object for raster tiles from MapTiler, providing fallback if vector tiles fail. |
| `buildFacilityCollection(facilities: MapLibreFacility[], selectedFacilityId: string | null)` | `facilities: MapLibreFacility[], selectedFacilityId: string | null` | `GeoJSON.FeatureCollection<GeoJSON.Point>` | Transforms an array of `MapLibreFacility` objects into a GeoJSON FeatureCollection suitable for rendering facility points on the map.  Handles the selection state of a facility. |
| `MapLibreFacility` |  |  | Interface defining the structure for facility data, including ID, name, coordinates, type, accent color, and optional details. |
| `MapLibreIssue` |  |  | Interface defining the structure for issue data, including ID, label, coordinates, accent color, and optional details. |
| `MapLibreCurrentLocation` |  |  | Interface defining the structure for current location data, including latitude, longitude, and optional accuracy and title/subtitle. |
| `MapLibreRoutePoint` |  |  | Interface defining the structure for a route point, including latitude and longitude. |
| `MapLibreRoute` |  |  | Interface defining the structure for a route, including route ID, label, path, distance in meters, and duration in seconds. |
| `MapStyleCandidate` |  |  | Type defining a candidate map style, including kind, label, and style object. |
| `useTheme()` |  |  | React hook from `next-themes` that provides access to the current theme (light/dark). |
| `useEffect()` |  |  | React hook that performs side effects in functional components. Used for map initialization, layer updates, and event listeners. |
| `useMemo()` |  |  | React hook that memoizes the result of a function. Used to optimize performance by caching expensive calculations. |
| `useRef()` |  |  | React hook that returns a mutable ref object whose `.current` property is initialized to the passed argument. Used to store a reference to the MapLibre map instance. |
| `useState()` |  |  | React hook that adds state to functional components. Used to manage the map's state, such as loading status and selected facility. |
| `addTrafficLayer(map: maplibregl.Map)` | `map: maplibregl.Map` | `void` | Adds the traffic layer to the map. |
| `toggleTrafficLayer(map: maplibregl.Map, isTrafficEnabled: boolean)` | `map: maplibregl.Map, isTrafficEnabled: boolean` | `void` | Toggles the visibility of the traffic layer. |
| `addSafeSpacesLayer(map: maplibregl.Map)` | `map: maplibregl.Map` | `void` | Adds the safe spaces layer to the map. |
| `startLocationTracking(map: maplibregl.Map, setLocation: (location: MapLibreCurrentLocation) => void)` | `map: maplibregl.Map, setLocation: (location: MapLibreCurrentLocation) => void` | `void` | Starts tracking the user's location and updates the map with the current location. |
| `logClientError(message: string, error?: any)` | `message: string, error?: any` | `void` | Logs client-side errors to the console and potentially to a remote logging service. |

## Dependencies

```typescript
import maplibregl from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { addTrafficLayer, toggleTrafficLayer } from '@/lib/traffic-layer';
import { addSafeSpacesLayer } from '@/lib/safe-spaces-layer';
import { startLocationTracking } from '@/lib/location-tracker';
import { logClientError } from '@/lib/client-logger';
```

## Configuration

*   `NEXT_PUBLIC_MAPTILER_KEY`:  Environment variable.  API key for MapTiler services.  Used for glyphs in the raster style.
*   `NEXT_PUBLIC_MAP_STYLE_URL`: Environment variable.  URL for the map style. Defaults to `https://tiles.openfreemap.org/styles/liberty` if not provided.
*   `ACCURACY_SOURCE_ID`: Constant. ID for the source of the current location accuracy circle.
*   `ACCURACY_FILL_LAYER_ID`: Constant. ID for the fill layer of the current location accuracy circle.
*   `ACCURACY_LINE_LAYER_ID`: Constant. ID for the line layer of the current location accuracy circle.
*   `ROUTE_SOURCE_ID`: Constant. ID for the source of the active route.
*   `ROUTE_ALT_CASING_LAYER_ID`: Constant. ID for the casing layer of the alternate route.
*   `ROUTE_ALT_LINE_LAYER_ID`: Constant. ID for the line layer of the alternate route.
*   `ROUTE_CASING_LAYER_ID`: Constant. ID for the casing layer of the active route.
*   `ROUTE_LINE_LAYER_ID`: Constant. ID for the line layer of the active route.
*   `FACILITY_SOURCE_ID`: Constant. ID for the source of the facilities data.
*   `FACILITY_CLUSTER_LAYER_ID`: Constant. ID for the cluster layer of the facilities data.
*   `FACILITY_CLUSTER_COUNT_LAYER_ID`: Constant. ID for the cluster count layer of the facilities data.
*   `FACILITY_UNCLUSTERED_LAYER_ID`: Constant. ID for the unclustered points layer of the facilities data.
*   `FACILITY_SELECTED_LAYER_ID`: Constant. ID for the selected facility layer.
*   `OPENFREEMAP_STYLE_URL`: Constant. Fallback map style URL.

## Usage Examples

```typescript
// Example of initializing the map within the component
const mapContainer = useRef<HTMLDivElement>(null);
const [map, setMap] = useState<maplibregl.Map | null>(null);

useEffect(() => {
    if (!mapContainer.current || map) return;

    const newMap = new maplibregl.Map({
        container: mapContainer.current,
        style: OPENFREEMAP_STYLE_URL, // Or a style from buildMapTilerRasterStyle
        center: [78.45, 17.38], // Example: Hyderabad
        zoom: 12,
    });

    setMap(newMap);

    return () => {
        newMap.remove(); // Clean up on unmount
    };
}, [map]);

// Example of adding a traffic layer
useEffect(() => {
    if (!map) return;
    addTrafficLayer(map);
}, [map]);
```

## Error Handling

*   `logClientError()` is used to log client-side errors.  This function is called when errors occur during map initialization, layer loading, or data fetching.
*   Fallback to raster tiles from MapTiler if vector tiles fail.
*   The component handles potential errors during location tracking.

## Related Modules

*   `@/lib/traffic-layer`:  Module responsible for managing the traffic layer.
*   `@/lib/safe-spaces-layer`: Module responsible for managing the safe spaces layer.
*   `@/lib/location-tracker`: Module responsible for tracking the user's location.
*   `@/lib/client-logger`: Module responsible for logging client-side errors.
*   `next-themes`:  Provides theme context (light/dark mode).
