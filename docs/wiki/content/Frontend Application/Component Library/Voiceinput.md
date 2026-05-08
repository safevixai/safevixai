```markdown
# VoiceInput.tsx

## Overview

The `VoiceInput` component provides a user interface for voice-to-text input using the Web Speech API. It allows users to record their voice and transcribe it into text, which is then passed to a parent component via the `onResult` prop. The component visually indicates recording status and provides a fallback mechanism for browsers that do not support the Web Speech API.

## Architecture

This component resides within the frontend application's component library. It leverages the Web Speech API for speech recognition, handling user interaction through a button that toggles recording. The transcribed text is then passed to a callback function provided by the parent component. It utilizes Next.js's client-side rendering (`'use client'`) and integrates with the overall application's UI through styling and event handling.

## Key Classes/Functions

