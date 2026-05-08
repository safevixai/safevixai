```markdown
# Toast.tsx

## Overview

The `Toast.tsx` component is a reusable UI element for displaying brief, non-blocking notifications to the user within the SafeVixAI frontend application. It provides feedback on user actions or system events, such as success, error, or informational messages, and automatically dismisses itself after a specified duration. The component leverages animation libraries for a smooth appearance and disappearance.

## Architecture

This component resides within the `frontend/components/dashboard/` directory and is part of the frontend application's component library. It is a presentational component, receiving data (message, type, visibility, duration, and a close function) as props and rendering a styled notification. It utilizes the `motion` library for animations and `lucide-react` for icons. It is rendered conditionally based on the `isVisible` prop and positioned fixed on the screen.

## Key Classes/Functions

