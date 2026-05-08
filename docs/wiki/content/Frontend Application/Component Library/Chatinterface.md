```markdown
# ChatInterface.tsx

## Overview

`ChatInterface.tsx` is a React component that provides a user interface for interacting with the SafeVixAI chatbot. It allows users to input questions, receive responses from the AI, and view the conversation history. The component supports both online (using a backend API) and offline (local AI) modes, adapting to network connectivity.

## Architecture

This component resides within the frontend application's component library. It leverages the `useAppStore` hook for global state management (AI mode and connectivity), `useGeolocation` for location data, and interacts with the backend API (FastAPI) for online AI responses.  It also utilizes a local offline AI implementation. The component manages the display of messages, handles user input, and streams responses from the AI. It uses Server-Sent Events (SSE) for real-time updates from the online AI.

## Key Classes/Functions

