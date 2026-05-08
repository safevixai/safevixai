# `navigation-launch.ts` Module

## Overview

The `navigation-launch.ts` module provides a smart launcher for opening navigation applications like Google Maps, Waze, and Apple Maps. It intelligently detects the user's platform (iOS, Android, or desktop) and respects user preferences stored in local storage, providing a seamless navigation experience. The module includes functions to open each navigation app directly, as well as a central function to determine and launch the best available app.

## Architecture

This module resides within the frontend application, specifically in the `frontend/lib/` directory. It is designed to be a utility module, providing a simple API for launching navigation apps. It leverages platform detection based on the `navigator.userAgent` string and utilizes `localStorage` for user preference persistence. The module is intended to be used within the Next.js frontend to provide navigation functionality. It does not interact with the backend (FastAPI) directly, but can be used in conjunction with data fetched from the backend.

## Key Classes/Functions

