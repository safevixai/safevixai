# `waze_feed.py` — Waze CIFS Feed API

## Overview

The `waze_feed.py` module provides an API endpoint that generates a Closure and Incident Feed Specification (CIFS) compliant JSON feed. This feed is specifically designed for Waze, allowing verified road safety reports from the SafeVixAI platform to be displayed as live hazard pins within the Waze and Google Maps applications. This integration leverages the Waze Partner Hub to provide a single feed for both platforms.

## Architecture

This module resides within the FastAPI backend, specifically at the `/api/v1/feeds/waze` endpoint. It retrieves verified road issue reports from the PostgreSQL database, transforms them into the CIFS format, and serves the resulting JSON to Waze. The module interacts with the database using SQLAlchemy and relies on the `core.config` module for application settings. Authentication is handled by Supabase Auth, ensuring that only authorized requests can access the data. The Next.js frontend consumes data from this API.

## Key Classes/Functions

