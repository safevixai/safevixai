# `deep-link.ts` - Deep Link Context Parser

## Overview

The `deep-link.ts` module provides a centralized mechanism for parsing deep link parameters within the SafeVixAI frontend application. It extracts relevant information from URL search parameters, such as GPS coordinates, activation modes, source attribution, and session identifiers, enabling the application to respond appropriately to deep links, share targets, and QR codes. This module offers both a React hook for use within components and a static parser for use in non-component contexts like service workers and API routes.

## Architecture

This module is part of the frontend application, specifically residing in the `frontend/lib/` directory. It leverages Next.js's `useSearchParams` hook to access URL parameters. The module defines types for deep link context and validation helpers for parsing and sanitizing input. The `useDeepLinkContext` hook provides a strongly-typed context for use within React components, while `parseDeepLink` provides a static function for parsing deep links outside of React components. It interacts with Supabase Auth for session management, although this interaction is not explicitly shown in the code.

## Key Classes/Functions

