# `sarvam_provider.py` - Sarvam AI Chatbot Service

## Overview

This module provides an interface to the Sarvam AI language models, specifically designed for supporting Indian languages. It acts as a provider within the AI chatbot service, routing requests to either the direct Sarvam API (if available) or a Hugging Face Inference API endpoint as a fallback. The module prioritizes the direct Sarvam API for faster response times and utilizes the Hugging Face API when the direct API is unavailable or the API key is missing.

## Architecture

This module is part of the `chatbot_service/providers` directory, and is designed to be used by the providers/router.py module. It implements the `HttpProvider` abstract class, providing the necessary methods to interact with the Sarvam AI models. The `SarvamProvider` class handles the core logic for API calls, including authentication, request formatting, and response parsing. The `Sarvam105BProvider` class inherits from `SarvamProvider` and specializes in using the larger 105B model, primarily for high-stakes intents like legal advice. It leverages Supabase Auth for user authentication and Next.js/FastAPI for the frontend and backend infrastructure, respectively. LocalHashEmbeddingFunction (SHA-256) is used for embedding.

## Key Classes/Functions

