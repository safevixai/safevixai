# `mcp_server.py` - SafeVixAI MCP Server API

## Overview

The `mcp_server.py` module provides the core API for interacting with the SafeVixAI platform's Multi-Agent Communication Protocol (MCP) server. This server exposes several tools that allow external agents (like LLMs) to access and manipulate SafeVixAI data and functionality, such as retrieving emergency services, reporting road issues, and calculating traffic challans. This module is built using FastAPI and integrates with various backend services and data sources.

## Architecture

This module is part of the FastAPI backend, serving as an API endpoint for the MCP server. It utilizes the `FastMCP` class from the `mcp.server.fastmcp` library to define and manage tools. It interacts with several supporting services, including `OverpassService`, `EmergencyLocatorService`, and `ChallanService`, to fulfill requests. Data is stored in a PostgreSQL database and cached using Redis. The module is designed to be accessed by LLM providers to perform actions within the SafeVixAI ecosystem.

## Key Classes/Functions

