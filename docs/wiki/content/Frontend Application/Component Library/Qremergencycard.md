```markdown
# QREmergencyCard.tsx - Frontend Emergency Card Component

## Overview

The `QREmergencyCard` component renders a QR code that encodes a user's emergency contact information, designed for use in the SafeVixAI platform. This component generates a unique QR code based on the user's profile data, including name, blood group, vehicle number, and emergency contact, allowing first responders to quickly access vital information. It also provides options to copy the link to the QR code and share it via the device's native sharing functionality.

## Architecture

This component is part of the frontend application's component library, specifically within the profile section. It leverages the `useAppStore` hook to access user profile data fetched from Supabase Auth. The component uses the `QRCodeSVG` library to generate the QR code and `motion` from `motion/react` for animations. The generated QR code links to a dedicated emergency card page on the SafeVixAI platform, which is served by the Next.js frontend. The component is responsible for displaying the QR code, providing a visual indicator of profile completeness, and offering sharing and copy functionalities.

## Key Classes/Functions

