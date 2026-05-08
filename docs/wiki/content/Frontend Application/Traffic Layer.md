```markdown
# traffic-layer.ts

## Overview

This module provides functionality to display real-time traffic information on the map within the SafeVixAI frontend application. It leverages the TomTom Traffic API to fetch and render traffic flow and incident data as raster layers, enhancing the user's understanding of road conditions.  It also includes a function to toggle the visibility of these traffic layers.

## Architecture

This module resides within the `frontend/lib` directory of the Next.js application. It is responsible for interacting with the TomTom Traffic API and integrating the traffic data with the map rendering provided by `maplibregl`. It is a client-side module, designed to be executed within the user's browser.  It relies on the `client-logger` module for logging warnings.

## Key Classes/Functions

