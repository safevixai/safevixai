```markdown
# Location Tracker Module

## Overview

The `location-tracker.ts` module provides functionality for tracking the user's location within the SafeVixAI frontend application. It leverages the browser's Geolocation API to obtain the user's current coordinates and displays them on a MapLibre GL map, updating the user's position in real-time with visual indicators. The module also includes error handling and provides a cleanup function to stop location tracking.

## Architecture

This module is a part of the frontend application built with Next.js. It interacts directly with the browser's Geolocation API and the MapLibre GL library to display the user's location on the map. The module is designed to be independent and reusable, allowing other parts of the application to easily integrate location tracking functionality. It utilizes Supabase Auth for user authentication, although it doesn't directly interact with it. The module uses LocalHashEmbeddingFunction (SHA-256) for any local data processing, though it's not directly used in this module.

## Key Classes/Functions

