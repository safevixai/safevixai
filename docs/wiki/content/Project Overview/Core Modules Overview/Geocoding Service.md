# `geocoding_service.py` - Geocoding Module

## Overview

The `geocoding_service.py` module provides a service for geocoding and reverse geocoding functionalities within the SafeVixAI platform. It leverages external geocoding APIs (Photon and Nominatim) to translate between geographic coordinates (latitude and longitude) and human-readable addresses, and vice-versa. This module caches results to improve performance and reduce the load on external APIs.

## Architecture

This module is a core service within the FastAPI backend. It's responsible for interacting with external geocoding APIs (Photon and Nominatim). It utilizes a `CacheHelper` (from `core.redis_client`) for caching geocoding results, improving response times and reducing API call volume. The module is designed to be asynchronous, utilizing `httpx` for non-blocking HTTP requests. It is used by other modules that require location data.

## Key Classes/Functions

