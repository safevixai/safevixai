```markdown
# `map-defaults.ts`

## Overview

The `map-defaults.ts` module defines default map settings for the SafeVixAI frontend application. It provides fallback coordinates, zoom levels, and default zoom levels for the map, ensuring a consistent and user-friendly map experience even when specific location data is unavailable or not yet loaded.

## Architecture

This module resides within the `frontend/lib` directory of the Next.js frontend application. It is a utility module, providing constant values used throughout the application, particularly within map-related components and services. It is independent of the 9 LLM providers, Supabase Auth, FastAPI backend, and LocalHashEmbeddingFunction. It is a foundational component for the map rendering and user experience.

## Key Classes/Functions

