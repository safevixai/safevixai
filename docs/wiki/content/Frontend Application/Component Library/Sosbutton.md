```markdown
# SOSButton.tsx

## Overview

The `SOSButton` component provides a user interface element for triggering emergency alerts. It features a pulsative animation and a double-tap confirmation flow, allowing users to send SOS messages via WhatsApp and SMS, including their GPS location and user profile information. The component utilizes `motion` for animations and integrates with the application's state management via `useAppStore`.

## Architecture

This component resides within the Frontend Application's Component Library. It's a client-side React component (`'use client'`) designed to be rendered on the user's device. It interacts with the application's state management (`useAppStore`) to access user profile and GPS location data. It leverages utility functions (`generateSosWhatsAppLink`, `generateSosSmsLink`) to construct the appropriate share links. The component is positioned fixed at the bottom center of the viewport.

## Key Classes/Functions

