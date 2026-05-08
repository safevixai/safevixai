```markdown
# maps-fallback.ts

## Overview

This module provides a fallback mechanism for searching for emergency services using the Google Maps API. It is only invoked when the primary search using PostGIS in Supabase returns no results, acting as a last resort to provide relevant information to the user. This ensures that even in cases where the primary search fails, the application can still attempt to locate nearby emergency services.

## Architecture

This module resides within the frontend application, specifically in the `frontend/lib` directory. It is designed to be called after a primary search using PostGIS in Supabase fails to return any results. It interacts with the Google Maps API using the `fetch` API to retrieve nearby places based on a query, latitude, and longitude. The results are then formatted and returned to the calling function. It does *not* handle main map rendering, which is handled by MapLibre.

## Key Classes/Functions

