```markdown
# `offline-ai.ts` — Gemma 4 E2B Offline AI Engine

## Overview

This module provides an offline AI engine for the SafeVixAI frontend application, leveraging the Gemma 4 E2B model. It prioritizes using Chrome's built-in AI (Android AICore) for instant availability, falling back to a Transformers.js implementation for offline functionality, and finally, a keyword fallback mechanism. The module handles model loading, progress updates, and provides a public API for initializing and interacting with the offline AI.

## Architecture

This module resides within the `frontend/lib` directory of the Next.js application. It is a client-side module (`'use client'`) and is responsible for managing the lifecycle of the Gemma 4 E2B model. It interacts with the browser's environment to detect and utilize Chrome's built-in AI capabilities or download and load the Transformers.js model. It exposes a public API (`getOfflineAI`) for initialization and provides progress updates via callbacks. The module uses a strategy of checking for system AI first, then downloading the Transformers.js model if necessary.

## Key Classes/Functions

