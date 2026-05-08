```markdown
# ChallanCalculator.tsx

## Overview

The `ChallanCalculator` component is a frontend module within the SafeVixAI platform designed to calculate traffic challans (fines) based on user-selected violations, vehicle class, state, and repeat offender status. It provides a user-friendly interface with a visual violation selector, configuration options, and displays the calculated fine information, leveraging both online and offline data sources. The component adheres to the Stitch Design `6304aa246be8445781a95e263d919f85`.

## Architecture

This component resides within the frontend application's component library, specifically at `frontend/components/ChallanCalculator.tsx`. It utilizes Next.js for server-side rendering and client-side interactivity. It interacts with the backend through the `calculateChallan` API function, which potentially uses 9 LLM providers for fine calculations. It also incorporates Supabase Auth for user authentication and uses a LocalHashEmbeddingFunction (SHA-256) for local data processing in offline mode. The component leverages the `useAppStore` for global state management and `motion/react` for animations.

## Key Classes/Functions

