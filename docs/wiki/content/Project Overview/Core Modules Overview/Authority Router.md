# Authority Router Module

## Overview

The `authority_router.py` module is responsible for determining the relevant authority responsible for a given road segment based on its location. It acts as a central point for routing road safety issues to the appropriate governmental or administrative body, leveraging both local database lookups and external data sources like OpenStreetMap via the `OverpassService`.

## Architecture

This module resides within the FastAPI backend services. It receives latitude and longitude coordinates as input and returns an `AuthorityPreviewResponse` containing information about the responsible authority, including contact details and escalation paths. It first attempts to resolve the authority using a local database lookup. If that fails, it queries the Overpass API for road context information. If both attempts fail, it falls back to a default "URBAN" authority.

## Key Classes/Functions

