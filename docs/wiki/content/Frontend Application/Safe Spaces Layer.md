```markdown
# Safe Spaces Layer - Frontend Application

## Overview

The `safe-spaces-layer.ts` module is responsible for displaying safe spaces (e.g., hospitals, police stations) on the map within the SafeVixAI frontend application. It fetches data about nearby safe spaces from the `/api/v1/emergency/safe-spaces` API endpoint, parses the response, and adds a layer to the map to visualize these locations using colored circles. The module handles both initial layer creation and updating the layer with new data.

## Architecture

This module is part of the frontend application built with Next.js. It interacts with the backend API (FastAPI) to retrieve data. The module utilizes the `maplibregl` library to add and manage a GeoJSON layer on the map.  The module is triggered when the map's center changes, or when a user explicitly requests a refresh of the safe spaces. The data fetched from the backend is then used to populate the map layer.

## Key Classes/Functions

