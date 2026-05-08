```markdown
# DashboardMapBootstrap.tsx

## Overview

`DashboardMapBootstrap.tsx` is a React component responsible for fetching and managing data related to nearby services, road issues, and the user's current location within the SafeVixAI dashboard. It leverages the `useGeolocation` hook to obtain the user's GPS coordinates, and then uses these coordinates to fetch relevant data from the backend API, storing the results in the application's state using Zustand. It also handles connectivity status and location refresh events.

## Architecture

This component resides within the frontend application's component library, specifically in the `frontend/components/dashboard` directory. It acts as a data fetching and management layer for the dashboard map, interacting with the backend API (FastAPI) to retrieve information about nearby services and road issues. It utilizes the `useAppStore` (Zustand) for state management and `useGeolocation` for location services. The component is designed to be a client-side component (`'use client'`) and is responsible for bootstrapping the map data.

## Key Classes/Functions

| Name | Parameters | Return | Description |
|---|---|---|---|
| `normalizeServiceCategory` | `category: string` | `NearbyService['category']` | Normalizes a service category string to a predefined set of categories (e.g., 'hospital', 'police'). |
| `toStoreServices` | `services: Awaited<ReturnType<typeof fetchNearbyServices>>['services']` | `NearbyService[]` | Transforms the response from `fetchNearbyServices` into an array of `NearbyService` objects suitable for the application's state. |
| `toStoreIssues` | `issues: Awaited<ReturnType<typeof fetchRoadIssues>>['issues']` | `NearbyRoadIssue[]` | Transforms the response from `fetchRoadIssues` into an array of `NearbyRoadIssue` objects suitable for the application's state. |
| `buildRadiusAttempts` | `requestedRadius: number` | `number[]` | Generates an array of search radius values, based on `SEARCH_RADIUS_STEPS` and the `requestedRadius`, used for fetching data with increasing search radii. |
| `DashboardMapBootstrap` |  |  | The main React component.  Fetches location, handles connectivity, fetches services and issues, and updates the application state. |

## Dependencies (imports)

*   `'use client'`
*   `useEffect`, `useMemo`, `useRef` from `react`
*   `fetchNearbyServices`, `fetchRoadIssues` from `@/lib/api`
*   `useGeolocation` from `@/lib/geolocation`
*   `getAddressFromGPS` from `@/lib/reverse-geocode`
*   `NearbyRoadIssue`, `NearbyService`, `useAppStore` from `@/lib/store`

## Configuration (env vars, constants)

*   `SEARCH_RADIUS_STEPS`: `[5_000, 12_000, 20_000, 35_000, 50_000]` - An array of search radius steps in meters.

## Usage Examples

```tsx
// Example of how the component is used within the dashboard
import DashboardMapBootstrap from '@/components/dashboard/DashboardMapBootstrap';

function Dashboard() {
  return (
    <div>
      <DashboardMapBootstrap />
      {/* Other dashboard components */}
    </div>
  );
}

export default Dashboard;
```

## Error Handling

*   **Geolocation Errors:** The component checks for geolocation errors via the `error` property returned by `useGeolocation`. If an error occurs, the component updates the connectivity status to either 'cached' (if online) or 'offline' and clears existing service and issue data.
*   **API Errors:** While not explicitly shown in the provided code, the `fetchNearbyServices` and `fetchRoadIssues` functions likely handle API errors internally. These errors would be propagated to the application's state through the `useAppStore` or handled in the API functions themselves.
*   **Connectivity:** The component actively monitors the user's online/offline status using `navigator.onLine` and updates the `connectivity` state accordingly. This allows the application to adapt its behavior based on network availability.

## Related Modules

*   `@/lib/api`: Contains functions for fetching data from the backend (e.g., `fetchNearbyServices`, `fetchRoadIssues`).
*   `@/lib/geolocation`: Provides the `useGeolocation` hook for obtaining the user's GPS location.
*   `@/lib/reverse-geocode`: Contains functions for converting GPS coordinates to human-readable addresses (e.g., `getAddressFromGPS`).
*   `@/lib/store`: Defines the application's state management using Zustand, including types for `NearbyRoadIssue`, `NearbyService`, and the `useAppStore` hook.
*   `frontend/components/dashboard/Dashboard.tsx`: The parent component that renders `DashboardMapBootstrap`.
