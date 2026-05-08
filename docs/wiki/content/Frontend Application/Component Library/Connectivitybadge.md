```markdown
# ConnectivityBadge.tsx

## Overview

The `ConnectivityBadge` component displays the current network connectivity status of the SafeVixAI frontend application. It leverages the `useAppStore` hook to access the global application state and renders a badge indicating whether the application is online, using cached data, offline, or if the AI is active. The badge's appearance (label and color) dynamically changes based on the connectivity state.

## Architecture

This component resides within the frontend application's component library, specifically at `frontend/components/ConnectivityBadge.tsx`. It's a presentational component that consumes the application's global state managed by `useAppStore` (likely using Zustand or a similar state management library). The component's visual representation is a simple `<span>` element with dynamic styling based on the `ConnectivityState`. It interacts with the `ConnectivityState` enum (likely defined in `src/lib/store.ts`) to determine the current connectivity status.

## Key Classes/Functions

