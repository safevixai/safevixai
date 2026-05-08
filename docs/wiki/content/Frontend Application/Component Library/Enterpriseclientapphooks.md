# EnterpriseClientAppHooks.tsx

## Overview

`EnterpriseClientAppHooks.tsx` is a React component that provides core functionality for the SafeVixAI frontend application, specifically focusing on crash detection and SOS dispatch. It manages user authentication with Supabase, initiates and stops crash detection based on accelerometer data, and handles the automated dispatch of SOS messages with the user's GPS location when a crash is detected. It also handles offline SOS queuing.

## Architecture

This component resides within the frontend application's component library. It leverages the `useAppStore` for state management, interacts with Supabase for user authentication, and utilizes functions from the `api`, `crash-detection`, `offline-sos-queue`, and `safety-constants` modules to perform its tasks. It renders a UI element to display a countdown timer and provide options to cancel or manually trigger the SOS.

## Key Classes/Functions

