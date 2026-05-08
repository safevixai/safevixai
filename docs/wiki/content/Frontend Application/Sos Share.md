```markdown
# `sos-share.ts` Module - Frontend Application

## Overview

The `sos-share.ts` module provides functionality for generating emergency SOS messages for the SafeVixAI frontend application. It generates pre-filled WhatsApp and SMS links containing the user's location, profile information, and emergency contact details, enabling users to quickly alert emergency services in case of an accident. It leverages reverse geocoding and What3Words to provide more precise location information.

## Architecture

This module is part of the frontend application built with Next.js. It interacts with the `store.ts` module for user profile and GPS location data. It also utilizes a serverless function (`/api/w3w`) to fetch What3Words addresses. The module's functions are designed to be called from UI components to trigger the generation of SOS messages. The module relies on the `reverse-geocode.ts` module for address lookup.

## Key Classes/Functions

