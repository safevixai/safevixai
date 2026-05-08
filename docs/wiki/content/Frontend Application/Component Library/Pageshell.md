```markdown
# PageShell.tsx

## Overview

`PageShell.tsx` is a React component that provides the foundational layout and structure for the SafeVixAI frontend application. It handles the overall page structure, including the sidebar (visible on desktop), main content area, network monitoring, and global SOS functionality, ensuring a consistent user interface across different pages.

## Architecture

This component sits at the top level of the application's layout, wrapping all other page content. It leverages the `AppSidebar` component for the desktop sidebar, `NetworkMonitor` for network status updates, and `GlobalSOS` for emergency features. The `PageShell` component uses a state management solution (likely Zustand, as indicated by `useAppStore`) to manage the sidebar's collapsed/expanded state. It is a child of the `app` directory's `layout.tsx` file.

## Key Classes/Functions

