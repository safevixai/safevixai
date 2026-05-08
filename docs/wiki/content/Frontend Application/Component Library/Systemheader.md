```markdown
# SystemHeader.tsx

## Overview

`SystemHeader.tsx` is a React component that renders the header for the SafeVixAI dashboard. It provides navigation, a search bar, connection status indicators, and a theme switcher. The header is responsive, adapting to different screen sizes and providing a consistent user experience.

## Architecture

This component is part of the frontend application's component library, specifically within the `dashboard` directory. It's a presentational component, responsible for rendering UI elements and handling user interactions related to navigation, search, and theme selection. It utilizes Next.js for routing and state management through `useAppStore` and `useTheme` hooks. It leverages the `lucide-react` library for icons.

## Key Classes/Functions

