```markdown
# `sos_tool.py` - AI Chatbot Service - SOS Tool

## Overview

The `SosTool` module provides functionality for generating emergency information based on geographical coordinates. It leverages multiple services, including a backend API, What3Words, and geocoding, to retrieve and combine relevant data for an SOS payload. This module is designed to be used within the SafeVixAI chatbot service to provide users with critical information in emergency situations.

## Architecture

This module is part of the AI Chatbot Service within the SafeVixAI platform. It acts as a tool accessible by the chatbot, enabling it to retrieve emergency-related information. It interacts with a `BackendToolClient` to fetch data from the backend API, a `What3WordsTool` to convert GPS coordinates to What3Words addresses, and a `GeocodingClient` to obtain a human-readable address. The module utilizes asynchronous operations to optimize performance and minimize latency.

## Key Classes/Functions

