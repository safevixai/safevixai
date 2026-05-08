# `tracking.py` API Reference

## Overview

The `tracking.py` module provides a real-time tracking API using WebSockets for the SafeVixAI platform. It enables live GPS data streaming for tracking devices or individuals, utilizing Redis Pub/Sub for horizontal scaling and efficient message broadcasting across multiple backend instances. This module is crucial for the platform's core functionality of providing up-to-the-minute location information.

## Architecture

This module is part of the FastAPI backend, specifically under the `/api/v1/tracking` endpoint. It leverages WebSockets for persistent connections and real-time data transfer. It uses Redis for Pub/Sub to scale the WebSocket connections across multiple backend instances. The Next.js frontend consumes this API to display real-time location data. It integrates with Supabase Auth for authentication.

## Key Classes/Functions

