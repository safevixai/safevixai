# `geocode.py` API Reference

## Overview

The `geocode.py` module provides geocoding functionality for the SafeVixAI platform, allowing users to perform reverse geocoding (converting coordinates to addresses) and forward geocoding (searching for addresses and returning coordinates). This module integrates with a `GeocodingService` to abstract the underlying geocoding provider, enabling flexibility in provider selection and future expansion.

## Architecture

This module is part of the FastAPI backend, specifically within the `/api/v1` API version. It exposes two endpoints: `/reverse` for reverse geocoding and `/search` for forward geocoding. It relies on the `GeocodingService` (injected via FastAPI's dependency injection) to interact with the chosen geocoding provider. The Next.js frontend interacts with these endpoints to retrieve geocoding data.

## Key Classes/Functions

