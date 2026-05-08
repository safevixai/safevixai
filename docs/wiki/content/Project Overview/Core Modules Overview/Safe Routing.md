# Safe Routing Module (`safe_routing.py`)

## Overview

The `safe_routing.py` module provides safe route calculation functionality for the SafeVixAI platform, prioritizing routes that avoid potentially unsafe road segments, especially during nighttime. It leverages the OpenRouteService (ORS) API when an API key is provided, and gracefully falls back to the free OSRM service if no key is configured. This ensures route availability while enhancing safety by avoiding features like tracks and fords.

## Architecture

This module is a core component of the FastAPI backend, providing a service for calculating safe routes. It is directly called by the API endpoints that handle route requests from the Next.js frontend. It interacts with external routing APIs (ORS and OSRM) to retrieve route data and returns a structured response containing route details. The module uses the `httpx` library for making asynchronous HTTP requests to the routing APIs.

## Key Classes/Functions

