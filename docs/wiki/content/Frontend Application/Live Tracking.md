```markdown
# `live-tracking.ts` Module

## Overview

The `live-tracking.ts` module provides the frontend logic for real-time location tracking within the SafeVixAI platform. It enables both victims (those needing help) and family members to participate in location sharing, leveraging GPS data, Supabase authentication, and a REST API for communication. The module handles starting and stopping tracking sessions, updating location data, and notifying emergency contacts via WhatsApp.

## Architecture

This module resides within the frontend application, specifically in the `frontend/lib` directory. It interacts with the backend API (FastAPI) to initiate and manage tracking sessions. It utilizes Supabase for authentication and relies on the Next.js framework for frontend rendering and state management (via `useAppStore`). GPS data is obtained through the browser's `navigator.geolocation` API. The module uses a polling mechanism to retrieve location updates from the backend for family members.

## Key Classes/Functions

