```markdown
# ModelLoader.tsx

## Overview

`ModelLoader.tsx` is a React component responsible for displaying a loading screen while the offline AI model (Phi-3 Mini) is being downloaded and initialized. It provides visual feedback to the user, indicating the progress of the download with a progress bar and informative text. This component is displayed when the `aiMode` in the application state is set to 'loading'.

## Architecture

This component is part of the frontend application's component library. It sits on top of the main application content, using absolute positioning and a semi-transparent background to overlay the entire screen. It leverages the `useAppStore` hook to access and display the model loading progress and the current AI mode. The component is conditionally rendered based on the `aiMode` state.

## Key Classes/Functions

