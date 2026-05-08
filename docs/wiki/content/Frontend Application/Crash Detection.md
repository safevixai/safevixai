```markdown
# Crash Detection Module

## Overview

The `crash-detection.ts` module within the SafeVixAI frontend application provides real-time crash detection functionality using the DeviceMotionEvent API. It monitors device acceleration to identify sudden G-force spikes, indicating a potential accident, and triggers a callback function upon detection. This module is designed for web and PWA environments.

## Architecture

This module is a core component of the SafeVixAI frontend, residing within the `frontend/lib` directory. It leverages the DeviceMotionEvent API to access accelerometer data from the user's device.  It interacts directly with the browser's event system and provides a simple API for starting, stopping, and responding to crash events. The module does *not* directly communicate with the backend; it is responsible for detecting the event and notifying other frontend components.

## Key Classes/Functions

