# PotholeDetector.tsx

## Overview

The `PotholeDetector` component is a frontend React component designed for the SafeVixAI platform, providing a high-fidelity, tactical heads-up display (HUD) for pothole detection. It utilizes the device's camera to simulate pothole detection, displaying a scanning animation and confidence scores, adhering to the Stitch Design `0099684f88464a39b36d0193b2a24c28`.

## Architecture

This component resides within the frontend application's component library. It directly interacts with the user's device camera using the `navigator.mediaDevices.getUserMedia` API. The component simulates AI model inference and displays the results through visual elements like a scanning reticle, confidence score, and a "PH-CRATER DETECTED" overlay. It leverages Next.js for server-side rendering and client-side interactivity, Supabase Auth for user authentication, and interacts with the FastAPI backend. The component also utilizes the `motion` library for animations.

## Key Classes/Functions

