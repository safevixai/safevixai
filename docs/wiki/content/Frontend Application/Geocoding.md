```markdown
# `geocoding.ts` Module

## Overview

The `geocoding.ts` module provides functionality for searching and retrieving geographical location data using the Photon geocoding API. It enables the frontend application to perform autocomplete searches for places within India, enhancing user experience by suggesting relevant locations as the user types. The module includes a debouncing mechanism to optimize search requests and prevent excessive API calls.

## Architecture

This module resides within the frontend application, specifically in the `frontend/lib/` directory. It interacts with the Photon geocoding API (a free service from Komoot) to fetch location data. The module is used by the frontend components, such as the search bar, to provide location suggestions. It does not directly interact with the database or other backend services, but provides data that can be used by other modules to store location data. It leverages Next.js for frontend rendering and Supabase Auth for user authentication.

## Key Classes/Functions

