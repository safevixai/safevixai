```markdown
# FloatingSidebarControls.tsx

## Overview

`FloatingSidebarControls.tsx` is a React component designed to provide a floating sidebar with interactive controls for the SafeVixAI dashboard. It displays the driver's driving score using a custom gauge and provides tactical HUD buttons for actions like refreshing location data and accessing other dashboard features. The component leverages `motion` for animations and visual feedback.

## Architecture

This component resides within the `frontend/components/dashboard` directory of the Next.js application. It is a presentational component, responsible for rendering UI elements and handling user interactions related to the dashboard's floating controls. It utilizes the `useAppStore` hook (from `@/lib/store`) to access and display the driving score. The component is designed to be visually appealing and provide a responsive user experience with animations and hover effects.

## Key Classes/Functions

