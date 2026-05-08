# `safe_spaces.py` - Safe Public Spaces Module

## Overview

The `safe_spaces.py` module provides functionality to retrieve nearby safe public spaces, such as restaurants, cafes, pharmacies, hospitals, and police stations, using the Overpass API. It leverages real-time OpenStreetMap (OSM) data and includes a fallback mechanism to handle potential rate limits or service unavailability by querying multiple Overpass API endpoints. The module returns a structured dictionary containing the locations and details of identified safe spaces.

## Architecture

This module is a core component of the backend services within the SafeVixAI platform. It is designed to be a standalone service that can be called by other modules or APIs to retrieve safe space information. It interacts with the Overpass API (a service providing access to OpenStreetMap data) to fetch the required data. The module is designed to be resilient, handling potential API rate limits and errors gracefully by attempting requests to multiple Overpass API mirrors. The results are then formatted and returned to the calling service.

## Key Classes/Functions

| Name | Parameters | Return | Description |
|---|---|---|---|
| `close_safe_spaces_client()` | None | None | Asynchronously closes the shared `httpx.AsyncClient` when the application shuts down, releasing resources. |
| `get_safe_spaces(lat: float, lon: float, radius_m: int = 1000)` | `lat: float` (latitude), `lon: float` (longitude), `radius_m: int = 1000` (search radius in meters) | `dict` | Retrieves nearby safe spaces based on latitude, longitude, and search radius. Returns a dictionary containing a list of places, the number of places found, the search radius, the data source, and a warning message if the Overpass API is rate-limited. |

## Dependencies

*   `httpx`
*   `logging`

## Configuration

This module does not rely on any environment variables or explicit configuration files. The Overpass API endpoints are hardcoded within the `get_safe_spaces` function. The timeout for the HTTP requests is set to 20.0 seconds.

## Usage Examples

```python
import asyncio
from backend.services.safe_spaces import get_safe_spaces, close_safe_spaces_client

async def example_usage():
    """Demonstrates how to use the get_safe_spaces function."""
    latitude = 37.7749  # Example: San Francisco
    longitude = -122.4194
    radius = 500  # meters

    safe_spaces_data = await get_safe_spaces(latitude, longitude, radius)

    print(f"Safe Spaces Data: {safe_spaces_data}")

    # Close the client when done (e.g., during application shutdown)
    await close_safe_spaces_client()

if __name__ == "__main__":
    asyncio.run(example_usage())
```

## Error Handling

The `get_safe_spaces` function includes error handling for the following scenarios:

*   **HTTP Errors:** Catches `httpx.HTTPError` and `httpx.TimeoutException` during API requests. Logs a warning message and attempts to use alternative Overpass API endpoints.
*   **Rate Limiting:** Detects rate limiting (status codes 406, 429, 503) and attempts to use alternative Overpass API endpoints.
*   **Fallback:** If all Overpass API endpoints fail, returns an empty list of places with a warning message indicating that the data is temporarily unavailable due to rate limiting.

## Related Modules

This module is likely used by other backend services or API endpoints within the SafeVixAI platform that require location-based information about safe public spaces. It is designed to be a utility module and does not directly interact with other core modules like the authentication or data storage modules.
