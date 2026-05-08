```markdown
# `page.tsx` - Dashboard Main Page

## Overview

`page.tsx` is the main dashboard component for the SafeVixAI frontend application. It renders the interactive map, search functionality, alert overlays, and a collapsible right-side panel displaying area intelligence and relevant statistics. This component dynamically loads the map and manages the display of various UI elements based on data retrieved from the application's state.

## Architecture

This component sits at the root of the dashboard route within the Next.js application. It leverages several child components for specific functionalities, such as the map, search bar, sidebar, and alert overlays. It utilizes the `useAppStore` hook to access and manage application-wide state, including GPS location, nearby services, road issues, and connectivity status. The component is designed to be responsive, adapting its layout for different screen sizes.

## Key Classes/Functions

