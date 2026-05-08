```markdown
# ConnectivityProvider.tsx

## Overview

The `ConnectivityProvider` component provides real-time network connectivity status to the application. It leverages the browser's `navigator.onLine` property and listens for `online` and `offline` events to update the application's global state, allowing other components to react to changes in network availability. This ensures the application can adapt its behavior based on the user's internet connection.

## Architecture

This component is part of the frontend application's component library. It wraps the application's children, providing a context for network connectivity information. It interacts with the application's global state management system (`useAppStore`) to update the connectivity status. This component is a foundational element for building a resilient and user-friendly application that can gracefully handle network interruptions.

## Key Classes/Functions

