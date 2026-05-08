# RecentAlertsOverlay.tsx

## Overview

The `RecentAlertsOverlay` component displays a summary of recent road safety alerts near the user's location. It fetches alert data from the application state and renders a concise overview, including the number of active alerts and a scrollable list of the most recent alerts with visual indicators for issue type and severity. The overlay dynamically adjusts its position based on the state of the desktop sidebar.

## Architecture

This component is part of the frontend application's component library, specifically designed for the dashboard. It leverages the `useAppStore` hook to access and display data related to nearby road issues. The component is positioned fixed on the screen, overlaying other dashboard elements. It utilizes the `material-symbols-outlined` icon set for visual representation of alert types.

## Key Classes/Functions

