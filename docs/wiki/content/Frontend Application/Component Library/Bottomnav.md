# BottomNav.tsx

## Overview

`BottomNav.tsx` is a React component that renders a persistent bottom navigation bar for the SafeVixAI web application. It provides quick access to core features like the map, AI chat, locator, report, and first aid, enhancing user navigation on smaller screens. The component utilizes `motion` from the `motion/react` library for animated transitions and visual feedback, including an active indicator glow and pill effect.

## Architecture

This component is part of the Frontend Application's Component Library, specifically within the `dashboard` directory. It is a presentational component responsible for rendering the bottom navigation bar. It leverages Next.js for routing via `Link` and `usePathname` for determining the active navigation item based on the current URL. The component is designed to be responsive, hiding on larger screens (lg:hidden) and adapting to safe area insets on mobile devices. It is memoized for performance optimization.

## Key Classes/Functions

