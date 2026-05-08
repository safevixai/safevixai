```markdown
# GlobalSOS.tsx

## Overview

The `GlobalSOS` component provides a persistent "SOS" button across most pages of the SafeVixAI frontend application, allowing users to quickly initiate an emergency response. It renders a floating button that links to the `/sos` route, triggering the emergency protocol. The component adapts its appearance and positioning based on the device (mobile vs. desktop) and hides itself on pages that already have dedicated emergency features.

## Architecture

This component is part of the frontend application's component library, specifically designed for UI elements that are globally accessible. It leverages Next.js for routing and `motion` from the `motion/react` library for animations. It is a presentational component, meaning it focuses on rendering UI and does not directly interact with the application's data or state management, instead relying on navigation to the `/sos` route. It is positioned using CSS `fixed` positioning, ensuring it remains visible regardless of scrolling.

## Key Classes/Functions

