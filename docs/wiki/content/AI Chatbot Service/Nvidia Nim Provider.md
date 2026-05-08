# NvidiaNimProvider Module

## Overview

The `NvidiaNimProvider` module provides an interface to interact with NVIDIA's NIM (NVIDIA Inference Microservices) platform for AI model inference. This module specifically targets the NVIDIA cloud service, enabling access to GPU-optimized models like Llama 3.1 for generating text completions.

## Key Classes/Functions

| Name              | Parameters                               | Return          | Description                                                                 |
|-------------------|------------------------------------------|-----------------|-----------------------------------------------------------------------------|
| `NvidiaNimProvider` | None                                     | `NvidiaNimProvider` instance | Represents the NVIDIA NIM provider, inheriting from `HttpProvider`.        |
| `name`            | None                                     | `str`           | Returns the provider's name: "nvidia".                                      |
| `api_key_env`     | None                                     | `str`           | Returns the environment variable name for the NVIDIA NIM API key: "NVIDIA_NIM_API_KEY". |
| `base_url`        | None                                     | `str`           | Returns the base URL for the NVIDIA NIM API: "https://integrate.api.nvidia.com/v1/chat/completions". |
| `default_model`   | None                                     | `str`           | Returns the default model to use: "meta/llama-3.1-8b-instruct".             |
| `extra_headers`   | None                                     | `dict`          | Returns a dictionary of extra HTTP headers, including a User-Agent.        |

## Dependencies

*   `providers.base`:  This module depends on the `HttpProvider` class from the `providers.base` module.

## Configuration

The module relies on the following environment variables:

*   `NVIDIA_NIM_API_KEY`:  Your NVIDIA NIM API key, required for authentication.  Sign up at [build.nvidia.com](https://build.nvidia.com) for free credits.
*   `NVIDIA_NIM_MODEL` (optional):  Allows overriding the default model. If not set, the `default_model` will be used.

## Usage Examples

```python
from chatbot_service.providers.nvidia_nim_provider import NvidiaNimProvider

# Initialize the provider (assuming NVIDIA_NIM_API_KEY is set in the environment)
provider = NvidiaNimProvider()

# Access provider name
provider_name = provider.name
print(f"Provider Name: {provider_name}")

# Access the default model
default_model = provider.default_model()
print(f"Default Model: {default_model}")

# Access the base URL
base_url = provider.base_url()
print(f"Base URL: {base_url}")
```
