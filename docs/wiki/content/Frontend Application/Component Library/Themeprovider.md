```markdown
# ThemeProvider.tsx

## Overview

`ThemeProvider.tsx` provides a theming solution for the SafeVixAI frontend application, allowing users to switch between light, dark, and system-default themes. It utilizes React Context to manage the current theme and its resolved value, persisting the user's preference in local storage. The component dynamically applies the selected theme to the `<html>` element using `data-theme` attribute and CSS classes for styling.

## Architecture

This module is a core component within the frontend application's component library. It wraps the application's content, providing a theme context that allows child components to access and modify the current theme. It interacts with the browser's local storage to persist user theme preferences and responds to system theme changes (light/dark mode) when the theme is set to 'system'. It is a client-side component, indicated by the `'use client'` directive.

## Key Classes/Functions

