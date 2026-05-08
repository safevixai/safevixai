```markdown
# SystemSidebar.tsx Module

## Overview

The `SystemSidebar.tsx` module implements the responsive sidebar navigation for the SafeVixAI frontend application. It provides a mobile-first, animated sidebar that offers access to core features and quick dial options, enhancing user experience on smaller screens. The sidebar utilizes `motion` for animations and `useAppStore` for state management.

## Architecture

This module is a React functional component designed for the frontend application. It's a presentational component that renders a sidebar, which is conditionally displayed based on the `isSystemSidebarOpen` state managed by the `useAppStore` hook. The sidebar is designed to be hidden by default on larger screens (using `lg:hidden`) and appears as an overlay on smaller screens. It uses `Next.js` for routing via `Link` and `usePathname` to highlight the current active route.

## Key Classes/Functions

