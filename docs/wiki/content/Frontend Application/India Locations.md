```markdown
# `india-locations.ts` Module

## Overview

The `india-locations.ts` module provides functionality to retrieve and cache state and city data for India, primarily for use in dropdown selections within the SafeVixAI frontend. It fetches this data from the CountryStateCity API, caching results to minimize API calls and improve performance.  This module is crucial for enabling users to specify their location when using the DriveLegal feature.

## Architecture

This module resides within the `frontend/lib` directory of the SafeVixAI Next.js application. It acts as a data provider for Indian state and city information, interacting with the CountryStateCity API. The module utilizes caching mechanisms (`statesCache`, `citiesCache`) to store retrieved data, reducing the load on the external API and improving responsiveness. It is used by frontend components that require location-based data, such as the DriveLegal form.

## Key Classes/Functions

| Name                 | Parameters         | Return              | Description                                                                                                                              |
| -------------------- | ------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `getIndianStates()`  | None               | `Promise<string[]>` | Fetches and returns an array of Indian state names.  Caches the results after the first successful API call. Uses `FALLBACK_STATES` on error. |
| `getCitiesForState(state: string)` | `state: string`     | `Promise<string[]>` | Fetches and returns an array of city names for a given Indian state. Caches results based on the state. Returns an empty array on error. |

## Dependencies

*   `fetch`:  Built-in JavaScript function for making HTTP requests.

## Configuration

*   `API_BASE`:  A constant string representing the base URL for the CountryStateCity API: `'https://countriesnow.space/api/v0.1/countries'`.
*   `statesCache`:  A variable of type `string[] | null` used to cache the list of Indian states. Initialized to `null`.
*   `citiesCache`:  A `Map<string, string[]>` used to cache city names for each Indian state.
*   `FALLBACK_STATES`: A constant array of strings providing a hardcoded list of Indian states to be used if the API call fails.

## Usage Examples

```typescript
import { getIndianStates, getCitiesForState } from './india-locations';

// Get all Indian states
async function loadStates() {
  const states = await getIndianStates();
  console.log('Indian States:', states);
  // Example: Populate a dropdown with the states
}

// Get cities for a specific state
async function loadCities(state: string) {
  const cities = await getCitiesForState(state);
  console.log(`Cities in ${state}:`, cities);
  // Example: Populate a dropdown with the cities
}

// Example usage within a component
// useEffect(() => {
//   loadStates();
// }, []);
```

## Error Handling

The `getIndianStates()` and `getCitiesForState()` functions include `try...catch` blocks to handle potential errors during API calls. If an error occurs, `getIndianStates()` returns the `FALLBACK_STATES` array, and `getCitiesForState()` returns an empty array.  The `fetch` calls also check the `res.ok` status to ensure the API request was successful.

## Related Modules

*   Frontend components that utilize the state and city data (e.g., DriveLegal form components).
```