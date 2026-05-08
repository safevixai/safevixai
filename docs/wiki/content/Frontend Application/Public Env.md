```markdown
# `public-env.ts` - Frontend Application Environment Variables

## Overview

The `public-env.ts` module is responsible for managing and validating public environment variables used by the SafeVixAI frontend application. It retrieves environment variables from `.env.local` and Vercel environment variables, ensuring that required variables are present and correctly formatted. This module provides functions to access API URLs and construct WebSocket URLs for communication with the backend services.

## Architecture

This module resides within the `frontend/lib` directory of the Next.js frontend application. It is a utility module that is imported and used by other frontend components and services to access configuration settings. It interacts directly with the `process.env` object to retrieve environment variables and provides a centralized location for managing these variables. It is used by components that need to communicate with the FastAPI backend and the chatbot service.

## Key Classes/Functions

