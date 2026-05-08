```markdown
# EmergencyMapInner.tsx

## Overview

`EmergencyMapInner.tsx` is a React component responsible for rendering the interactive map within the SafeVixAI frontend application. It leverages the `MapLibreCanvas` component to display emergency facilities, routes, and the user's current location, providing a visual interface for road safety information. It processes facility data, transforms it for the `MapLibreCanvas` component, and manages the display of routes and location data.

## Architecture

This component is part of the Frontend Application's Component Library. It acts as a container for the `MapLibreCanvas` component, handling the data transformation and prop passing necessary for rendering the map with relevant information. It receives data from parent components regarding facilities, routes, and user location, and then passes this data to `MapLibreCanvas` for rendering. It is a child component of a larger map component, likely responsible for handling user interactions and data fetching.

## Key Classes/Functions

