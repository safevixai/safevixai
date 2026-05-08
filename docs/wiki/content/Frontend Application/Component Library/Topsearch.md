```markdown
# TopSearch.tsx

## Overview

`TopSearch.tsx` is a React component responsible for the search bar and associated UI elements at the top of the SafeVixAI application. It provides a user interface for searching locations using a geocoding service, displays location information, and handles navigation, including a back button and a menu toggle.

## Architecture

This component is part of the frontend application's component library, specifically within the `dashboard` directory. It is a child component, intended to be rendered within the main layout or map view. It utilizes the `useAppStore` hook for global state management (location, service category, sidebar open state) and `useTheme` for theme context. It interacts with the `geocoding` service to fetch search results. The component uses `motion` for animations.

## Key Classes/Functions

| Name | Params | Return | Description |
|---|---|---|---|
| `TopSearchProps` | `isMapPage?: boolean`, `forceShow?: boolean`, `showBack?: boolean`, `backHref?: string` | - | Interface defining the properties passed to the `TopSearch` component. |
| `MAP_FILTER_CHIPS` | - | `Array<{ label: string; value: 'all' | 'hospital' | 'police' | 'ambulance' | 'fire' | 'pharmacy'; icon: string; color: string; bg: string; }>` | Constant array defining the filter chips for map services. |
| `TopSearch` | `isMapPage?: boolean`, `forceShow?: boolean`, `showBack?: boolean`, `backHref?: string` | React.ReactElement | Main component function, renders the search bar, location information, and back/menu buttons. |
| `handleSearch` | `e: React.FormEvent` | - | Handles the form submission when the search button is clicked. If results are available, it selects the first result. |
| `selectResult` | `r: GeocodingResult` | - | Handles the selection of a search result. It dispatches a custom event to fly the map to the selected location and updates the search query. |
| `requestLocation` | - | - | Dispatches a custom event to refresh the user's current location. |

## Dependencies

```typescript
import React, { useState, useEffect, memo } from 'react';
import Link from 'next/link';
import { Menu, Mic, MapPin, Moon, Sun, Monitor, Search, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { formatAccuracyLabel, formatLocationLabel, isApproximateLocation } from '@/lib/location-utils';
import { useAppStore } from '@/lib/store';
import { useTheme } from '@/components/ThemeProvider';
import { searchPlaces, GeocodingResult } from '@/lib/geocoding';
```

## Configuration

This component does not use environment variables directly. It relies on the `useAppStore` for global state and the `useTheme` context for theme information.  The `searchPlaces` function from `geocoding` library likely handles API key configuration internally.

## Usage Examples

```typescript
// Basic usage within a page component
import TopSearch from '@/components/dashboard/TopSearch';

function MyPage() {
  return (
    <div>
      <TopSearch isMapPage={true} />
      {/* ... other page content ... */}
    </div>
  );
}

export default MyPage;

// Usage with back button
import TopSearch from '@/components/dashboard/TopSearch';

function MyOtherPage() {
  return (
    <div>
      <TopSearch showBack={true} backHref="/" />
      {/* ... other page content ... */}
    </div>
  );
}

export default MyOtherPage;
```

## Error Handling

*   **GPS Errors:** The component displays the `gpsError` from the `useAppStore` if location services are unavailable or an error occurs.
*   **Geocoding Errors:** The `searchPlaces` function (imported from `@/lib/geocoding`) is responsible for handling errors during the geocoding API calls. These errors are not explicitly handled in `TopSearch.tsx`, but the absence of results or a lack of search suggestions can be considered an implicit error state.

## Related Modules

*   `@/lib/location-utils`: Provides utility functions for formatting location labels and accuracy.
*   `@/lib/store`:  Provides the global state management using Zustand, including `gpsError`, `gpsLocation`, `serviceCategory`, `setServiceCategory`, and `setSystemSidebarOpen`.
*   `@/components/ThemeProvider`: Provides theme context.
*   `@/lib/geocoding`: Provides the `searchPlaces` function for geocoding.
*   `frontend/app/map/page.tsx`: Likely the primary consumer of this component, as it uses the `isMapPage` prop.
