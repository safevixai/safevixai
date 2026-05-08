```markdown
# MapBackgroundInner.tsx

## Overview

`MapBackgroundInner.tsx` is a React component responsible for rendering the interactive map within the SafeVixAI dashboard. It leverages the `MapLibreCanvas` component to display the map, along with dynamic overlays for nearby services, road issues, and the user's current location. The component fetches data from the application store and formats it for display on the map.

## Architecture

This component is part of the frontend application's component library, specifically within the dashboard section. It acts as a container for the `MapLibreCanvas` component, providing it with data such as the user's GPS location, nearby services (hospitals, police, etc.), and reported road issues (accidents, floods, etc.). It interacts with the application store (`useAppStore`) to retrieve and format the necessary data for the map. The component is designed to be a child of a larger layout component, handling the map's visual presentation.

## Key Classes/Functions

| Name | Parameters | Return | Description |
|---|---|---|---|
| `formatDistance(meters: number)` | `meters: number` | `string` | Formats a distance in meters to a user-friendly string (e.g., "1.2 km" or "250 m"). |
| `serviceIcon(category: NearbyService['category'])` | `category: NearbyService['category']` | `string` | Returns a Material Icons icon name based on the service category (e.g., "local_hospital" for "hospital"). |
| `serviceColor(category: NearbyService['category'])` | `category: NearbyService['category']` | `string` | Returns a color code based on the service category (e.g., "#ef4444" for "hospital"). |
| `issueColor(issue: NearbyRoadIssue)` | `issue: NearbyRoadIssue` | `string` | Returns a color code based on the road issue severity and type. |
| `issueIcon(issue: NearbyRoadIssue)` | `issue: NearbyRoadIssue` | `string` | Returns a Material Icons icon name based on the road issue severity and type. |
| `MapBackgroundInner()` | None | JSX.Element | The main component function that renders the map and overlays.  It retrieves data from the application store, formats it, and passes it to the `MapLibreCanvas` component. |

## Dependencies

```typescript
import React, { useMemo } from 'react';
import { MapLibreCanvas, MapLibreFacility, MapLibreIssue } from '@/components/maps/MapLibreCanvas';
import { formatLocationSubtitle, isApproximateLocation } from '@/lib/location-utils';
import { FALLBACK_MAP_CENTER, FALLBACK_MAP_ZOOM, LIVE_MAP_ZOOM } from '@/lib/map-defaults';
import { NearbyRoadIssue, NearbyService, useAppStore } from '@/lib/store';
```

## Configuration

*   `FALLBACK_MAP_CENTER`: A constant representing the default map center coordinates (`[number, number]`) when GPS location is unavailable.
*   `FALLBACK_MAP_ZOOM`: A constant representing the default map zoom level (`number`) when GPS location is unavailable.
*   `LIVE_MAP_ZOOM`: A constant representing the zoom level (`number`) when the user's GPS location is available.

## Usage Examples

```typescript
// Inside MapBackgroundInner component:
return (
  <div className="absolute inset-0 z-0 h-full min-h-full w-full overflow-hidden">
    <MapLibreCanvas
      center={center}
      zoom={gpsLocation ? LIVE_MAP_ZOOM : FALLBACK_MAP_ZOOM}
      facilities={facilities}
      issues={issues}
      currentLocation={
        gpsLocation
          ? {
              lat: gpsLocation.lat,
              lon: gpsLocation.lon,
              accuracy: gpsLocation.accuracy,
              title: 'Current location',
              subtitle: formatLocationSubtitle(gpsLocation),
            }
          : null
      }
      viewportMode="center"
    />
  </div>
);
```

## Error Handling

The component implicitly handles errors by gracefully degrading the map display when GPS location is unavailable, using `FALLBACK_MAP_CENTER` and `FALLBACK_MAP_ZOOM`.  There is no explicit error handling within this component.  Errors related to data fetching from the store are handled within the `useAppStore` hook.

## Related Modules

*   `MapLibreCanvas.tsx`: The core map rendering component.
*   `@/lib/location-utils`: Contains utility functions for location formatting.
*   `@/lib/map-defaults`: Defines default map settings.
*   `@/lib/store`: The application store, providing data for the map.
*   `NearbyRoadIssue`: Type definition for road issues.
*   `NearbyService`: Type definition for nearby services.
```