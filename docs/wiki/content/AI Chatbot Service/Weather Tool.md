```markdown
# Weather Tool Module

## Overview

The `weather_tool.py` module provides weather data retrieval functionality for the SafeVixAI chatbot service. It leverages the Open-Meteo API as the primary source for weather information, falling back to OpenWeatherMap if Open-Meteo is unavailable. This module is crucial for providing context-aware responses and risk assessments within the AI chatbot.

## Architecture

This module resides within the `chatbot_service/tools` directory and is integrated into the AI Chatbot Service. It is designed to be a tool accessible by the chatbot to enrich its responses with real-time weather data. It interacts with external weather APIs (Open-Meteo and OpenWeatherMap) to fetch weather information based on provided latitude and longitude coordinates. The module utilizes `httpx` for making asynchronous HTTP requests.

## Key Classes/Functions

