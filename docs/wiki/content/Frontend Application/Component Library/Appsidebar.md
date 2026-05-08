```markdown
# AppSidebar.tsx

## Overview

`AppSidebar.tsx` is a React component that renders the application's sidebar navigation. It provides a persistent, collapsible sidebar with links to various sections of the SafeVixAI platform, including map, AI assistant, emergency services, and user profile. The sidebar also includes quick dial options for emergency contacts and a prominent SOS button.

## Architecture

This component is part of the frontend application's component library. It's a presentational component responsible for rendering the sidebar's UI and handling user interactions like collapsing/expanding the sidebar. It utilizes Next.js for routing, `motion` from `motion/react` for animations, and `lucide-react` for icons. The state of the sidebar's collapsed state is managed using `useAppStore` from a Zustand store.

## Key Classes/Functions

| Name | Params | Return | Description |
|---|---|---|---|
| `AppSidebar()` |  |  `JSX.Element` | The main component function that renders the sidebar.  It handles the sidebar's layout, navigation items, quick dial options, and the SOS button.  It uses `usePathname` to determine the active route and `useAppStore` to manage the sidebar's collapsed state. |
| `navItems` |  |  `Array<Object>` | An array of objects defining the navigation items. Each object contains an `icon` (React component), `label` (string), `href` (string), and `color` (string). |
| `quickDials` |  |  `Array<Object>` | An array of objects defining the quick dial options. Each object contains a `label` (string), `number` (string), and `icon` (React component). |

## Dependencies

```typescript
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import {
  MapPin,
  BotMessageSquare,
  MapPinPlus,
  HeartPulse,
  AlertTriangle,
  Scale,
  ShieldAlert,
  User,
  Settings,
  Phone,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
```

## Configuration

This component does not have any specific configuration via environment variables or constants. The appearance and behavior are determined by the hardcoded `navItems` and `quickDials` arrays, as well as the styling applied through Tailwind CSS classes. The collapsed state is managed by the `useAppStore` Zustand store, which is likely configured elsewhere in the application.

## Usage Examples

```tsx
// Basic usage within the main layout component:
import { AppSidebar } from '@/components/AppSidebar';

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}

export default MainLayout;
```

## Error Handling

This component does not explicitly handle errors. It relies on the underlying components and libraries (Next.js, React, Zustand, etc.) to handle any potential errors. Any errors related to navigation or state management would be handled by the respective libraries.

## Related Modules

*   `@/lib/store`:  The Zustand store that manages the `isDesktopSidebarCollapsed` state.
*   `frontend/app/(main)/page.tsx`: The main page, which likely uses this sidebar.
*   Other pages within the `frontend/app` directory (e.g., `/assistant`, `/locator`, `/first-aid`, etc.): These pages are linked to by the navigation items in the sidebar.
```