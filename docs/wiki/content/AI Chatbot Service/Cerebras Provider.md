# Cerebras Provider Module

## Overview

The `cerebras_provider.py` module provides an interface for interacting with the Cerebras AI cloud platform, specifically the llama-3.3-70b model. This module allows the SafeVixAI chatbot service to leverage Cerebras's high-speed LLM capabilities, acting as a potential overflow provider to handle requests when other providers, such as Groq, experience rate limiting.

## Architecture

This module is part of the AI Chatbot Service within the SafeVixAI platform. It inherits from the `HttpProvider` base class, providing a standardized way to interact with external LLM providers. It is integrated with the FastAPI backend and utilizes the `LocalHashEmbeddingFunction` for embedding generation. Authentication is handled via Supabase Auth with JWT. The module is accessed via the Next.js frontend.

## Key Classes/Functions

| Name                 | Parameters                               | Return Type | Description                                                                                                                              |
| -------------------- | ---------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `CerebrasProvider`   | None                                     | `CerebrasProvider` | Represents the Cerebras provider class, inheriting from `HttpProvider`.                                                                |
| `api_key_env`        | None                                     | `str`       | Returns the environment variable name used to store the Cerebras API key (`CEREBRAS_API_KEY`).                                             |
| `base_url`           | None                                     | `str`       | Returns the base URL for the Cerebras API endpoint (`https://api.cerebras.ai/v1/chat/completions`).                                      |
| `default_model`      | None                                     | `str`       | Returns the default model to use, which is "llama-3.3-70b".                                                                              |

## Dependencies

*   `providers.base`:  This module imports from the `providers.base` module, specifically the `HttpProvider` class.

## Configuration

The following environment variables are required for this module to function:

*   `CEREBRAS_API_KEY`: Your Cerebras API key.  Obtained from cloud.cerebras.ai after signing up.
*   `CEREBRAS_MODEL` (optional):  Allows overriding the default model ("llama-3.3-70b").

## Usage Examples

```python
# Assuming you have an instance of CerebrasProvider and a prompt
from providers.cerebras_provider import CerebrasProvider

cerebras_provider = CerebrasProvider()
prompt = "What are the main causes of road accidents?"

# Example of how this provider would be used within the larger system.
# This is a simplified example, actual usage would involve more complex logic
# for handling API calls, error handling, and request formatting.
# response = cerebras_provider.complete(prompt=prompt)
# print(response)
```

## Error Handling

Error handling is managed by the base class `HttpProvider`.  Specific error handling for Cerebras API responses should be implemented within the `HttpProvider` class or in a higher-level function that calls this provider.  This includes handling rate limits (30 RPM for the free tier) and invalid API keys.

## Related Modules

*   `providers/base.py`: The base class `HttpProvider` that `CerebrasProvider` inherits from.
*   The other provider modules (e.g., `groq_provider.py`, `gemini_provider.py`) within the `providers` directory.
