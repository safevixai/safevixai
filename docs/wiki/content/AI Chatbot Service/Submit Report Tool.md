# SubmitReportTool

## Overview

The `SubmitReportTool` module provides a tool for the SafeVixAI chatbot to submit road hazard reports directly to the backend API. It allows users to report issues like potholes or broken signage through the chat interface, streamlining the reporting process. If the backend API is unavailable, the tool gracefully falls back to providing guidance to the user on how to submit a report through the main application.

## Architecture

This module resides within the AI Chatbot Service, specifically under the `chatbot_service/tools` directory. It acts as an intermediary between the chatbot's user interface and the backend API responsible for storing and processing road hazard reports. It leverages the `httpx` library for making asynchronous HTTP requests to the backend's `/api/v1/roads/report` endpoint. The tool is designed to be initialized with the backend base URL, which is injected from the chatbot settings.

## Key Classes/Functions

