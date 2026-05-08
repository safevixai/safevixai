# `live_tracking.py` API Reference

## Overview

The `live_tracking.py` module provides the API endpoints for real-time location tracking within the SafeVixAI platform. It allows users to initiate tracking sessions, share a public tracking URL, and update their location data periodically. This functionality is crucial for emergency response and providing location information to family members or emergency services in case of an accident.

## Architecture

This module is part of the FastAPI backend, serving as an API endpoint for the Next.js frontend. It interacts with the Supabase database to store and retrieve tracking session data. It utilizes Supabase Auth for user authentication and JWT for generating shareable tracking URLs. The module is triggered when SOS is triggered or a crash is detected.

## Key Classes/Functions

