```markdown
# `supabase-auth.ts` - Supabase Authentication Module

## Overview

This module provides a client for interacting with Supabase authentication within the SafeVixAI frontend application. It initializes and manages the Supabase client, handling session persistence, automatic token refresh, and URL-based session detection. The module ensures that the Supabase client is properly configured with the necessary environment variables.

## Architecture

This module resides within the `frontend/lib` directory of the SafeVixAI frontend application, built with Next.js. It acts as a utility to manage Supabase authentication, providing a single point of access to the authenticated user's session. It integrates with the Supabase Auth service and is used by other frontend components to manage user login, logout, and access control based on user authentication status. It leverages the `@supabase/supabase-js` library.

## Key Classes/Functions

