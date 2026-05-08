```markdown
# what3words.py - AI Chatbot Service

## Overview

The `what3words.py` module provides a tool for converting GPS coordinates to and from human-readable 3-word addresses using the what3words API. This functionality is crucial for the SafeVixAI platform to accurately pinpoint and communicate user locations, especially during SOS situations, by providing a precise and easily shareable location format.

## Architecture

This module is part of the AI Chatbot Service within the SafeVixAI platform. It acts as a utility tool, specifically designed to be called by the chatbot service to translate GPS coordinates received from the user's device into a what3words address.  The module interacts with the what3words API via HTTP requests. It is designed to be used in conjunction with other modules within the chatbot service, such as the SOS message generation module, and leverages the platform's infrastructure including Supabase Auth, Next.js frontend, FastAPI backend, and LocalHashEmbeddingFunction.

## Key Classes/Functions

