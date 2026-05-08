```markdown
# location-utils.ts

## Overview

The `location-utils.ts` module provides utility functions for handling and formatting GPS location data within the SafeVixAI frontend application. It offers functions to format location labels, determine location accuracy, and display user-friendly location information based on the `GpsLocation` type. These functions are crucial for presenting location data to the user in a clear and concise manner, especially when dealing with varying levels of location accuracy.

## Architecture

This module resides within the `frontend/lib` directory of the Next.js frontend application. It is a utility module, meaning it provides helper functions used by other components within the application that require location data. It interacts with the `GpsLocation` type defined in the `store.ts` file. It does not directly interact with the backend or any external APIs, but it formats data that may be used to interact with them.

## Key Classes/Functions

