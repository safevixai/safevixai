```markdown
# ServiceCard.tsx

## Overview

The `ServiceCard` component is a reusable UI element designed to display information about nearby services (e.g., hospitals, police stations) within the SafeVixAI platform. It presents service details such as name, category, distance, and provides actions to call the service or get directions using a preferred navigation app. The component leverages the `NearbyService` type from the `@/lib/store` module and utilizes helper functions for navigation and distance formatting.

## Architecture

This component resides within the frontend application's component library, specifically in the `frontend/components` directory. It is a client-side React component (`'use client'`) built with Next.js. It receives a `NearbyService` object as a prop, which contains data fetched from the backend (potentially through one of the 9 LLM providers) and processed by the FastAPI backend. The component interacts with the user through buttons to trigger actions like calling a service or opening a navigation app. It also uses Supabase Auth for user authentication and authorization. The component is styled using CSS classes.

## Key Classes/Functions

