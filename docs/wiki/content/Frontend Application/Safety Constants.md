```markdown
# safety-constants.ts

## Overview

The `safety-constants.ts` module defines a set of constants used throughout the SafeVixAI frontend application. These constants encompass values related to physics (gravity), crash detection, network timeouts, and emergency contact information, ensuring consistent behavior and maintainability across the application.

## Architecture

This module resides within the `frontend/lib` directory of the Next.js frontend application. It is a utility module, providing constant values that are imported and used by various components and services within the frontend. It is not directly responsible for any user interface elements or data fetching, but rather provides the necessary values for calculations and configurations within other modules. It interacts with the other modules through imports.

## Key Classes/Functions

| Name | Params | Return | Description |
|---|---|---|---|
| `STANDARD_GRAVITY_MS2` | None | `number` | Represents the standard acceleration due to gravity in meters per second squared (m/s²). Value: 9.81. |
| `CRASH_THRESHOLD_G` | None | `number` | The acceleration threshold in G-force units that triggers crash detection. Value: 15. |
| `CRASH_DEBOUNCE_MS` | None | `number` | The duration in milliseconds to debounce crash detection events, preventing multiple crash alerts. Value: 60,000 (60 seconds). |
| `CRASH_COUNTDOWN_SECONDS` | None | `number` | The countdown duration in seconds before an emergency alert is triggered after a crash is detected. Value: 20. |
| `W3W_LOOKUP_TIMEOUT_MS` | None | `number` | The timeout duration in milliseconds for "What3Words" (W3W) location lookups. Value: 3,000 (3 seconds). |
| `OFFLINE_SOS_SYNC_TIMEOUT_MS` | None | `number` | The timeout duration in milliseconds for synchronizing SOS data when offline. Value: 8,000 (8 seconds). |
| `OFFLINE_CHALLAN_LOOKUP_DELAY_MS` | None | `number` | The delay in milliseconds before attempting a challan lookup when offline. Value: 600 (0.6 seconds). |
| `LIVE_TRACKING_POLL_INTERVAL_MS` | None | `number` | The interval in milliseconds for polling live tracking data. Value: 5,000 (5 seconds). |
| `GROUP_TRACKING_BROADCAST_INTERVAL_MS` | None | `number` | The interval in milliseconds for broadcasting group tracking updates. Value: 3,000 (3 seconds). |
| `EMERGENCY_NUMBER` | None | `string` | The emergency contact number. Value: '112'. |
| `AMBULANCE_NUMBER` | None | `string` | The ambulance contact number. Value: '108'. |

## Dependencies

This module has no external dependencies beyond the standard TypeScript environment. It does not import any other modules.

## Configuration

This module does not rely on any environment variables. All values are hardcoded constants.

## Usage Examples

```typescript
import {
  CRASH_THRESHOLD_G,
  CRASH_DEBOUNCE_MS,
  EMERGENCY_NUMBER,
} from './safety-constants';

// Example 1: Using crash detection threshold
if (acceleration > CRASH_THRESHOLD_G) {
  // Trigger crash detection logic
}

// Example 2: Using debounce time
setTimeout(() => {
  // Execute after debounce
}, CRASH_DEBOUNCE_MS);

// Example 3: Accessing emergency contact
const callEmergencyServices = () => {
  window.open(`tel:${EMERGENCY_NUMBER}`);
};
```

## Error Handling

This module itself does not contain any error handling logic. The constants defined within it are used by other modules, which are responsible for handling any errors that may arise from their usage.

## Related Modules

*   `frontend/components/CrashDetection.tsx`: Likely uses `CRASH_THRESHOLD_G` and `CRASH_DEBOUNCE_MS`.
*   `frontend/services/LocationService.ts`: May use `W3W_LOOKUP_TIMEOUT_MS`.
*   `frontend/services/SOSService.ts`: Likely uses `EMERGENCY_NUMBER`, `AMBULANCE_NUMBER` and `CRASH_COUNTDOWN_SECONDS`.
*   `frontend/services/TrackingService.ts`: Likely uses `LIVE_TRACKING_POLL_INTERVAL_MS` and `GROUP_TRACKING_BROADCAST_INTERVAL_MS`.
```