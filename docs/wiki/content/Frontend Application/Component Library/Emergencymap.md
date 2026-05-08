```markdown
# EmergencyMap.tsx

## Overview

`EmergencyMap.tsx` is a React component responsible for rendering the interactive map within the SafeVixAI frontend application. It leverages the `EmergencyMapInner` component to display emergency facilities, navigation routes, and the user's current location, providing a visual interface for road safety information. It dynamically loads the map rendering component to ensure stable server-side rendering.

## Architecture

This component resides within the Frontend Application's Component Library. It acts as a wrapper for the `EmergencyMapInner` component, handling the dynamic loading of the map and managing the props passed to the inner map component. It receives data such as facility locations, route information, and user location, and passes them to `EmergencyMapInner` for rendering. It is a child component of the main application layout and is likely rendered within a dedicated section or page related to emergency services or navigation.

## Key Classes/Functions

