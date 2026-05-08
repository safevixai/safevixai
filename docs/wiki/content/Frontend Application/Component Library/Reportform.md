```markdown
# ReportForm.tsx

## Overview

The `ReportForm` component provides a user interface for reporting road hazards within the SafeVixAI platform. It allows users to select the type of hazard, its severity, provide a description, and optionally upload a photo. The component handles both online and offline reporting, queuing reports for later synchronization when connectivity is restored.

## Architecture

This component resides within the frontend application's component library. It leverages the `useAppStore` hook for accessing global application state (specifically GPS location and connectivity status). It interacts with the `submitReport` API function to submit reports when online and utilizes the `enqueueRoadReport` function to store reports in an offline queue (likely using local storage) when offline. The component uses `motion` for animations and `toast` for user feedback.

## Key Classes/Functions

