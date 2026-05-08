```markdown
# `reverse-geocode.ts` Module

## Overview

The `reverse-geocode.ts` module provides functionality to convert GPS coordinates (latitude and longitude) into a human-readable address. It leverages the BigDataCloud free reverse geocoding API, performing the conversion directly in the browser, eliminating the need for backend calls and API key exposure.

## Architecture

This module is part of the frontend application built with Next.js. It's a utility function designed to be called from other frontend components that require address information based on GPS data. It interacts directly with the BigDataCloud API, ensuring client-side safety and minimizing backend dependencies. The module does not interact with the 9 LLM providers, Supabase Auth, FastAPI, or LocalHashEmbeddingFunction directly.

## Key Classes/Functions

