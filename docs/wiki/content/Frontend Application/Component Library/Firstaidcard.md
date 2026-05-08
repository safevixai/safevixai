```markdown
# FirstAidCard.tsx

## Overview

The `FirstAidCard` component is a reusable UI element designed to display first aid instructions within the SafeVixAI frontend application. It presents information in a clear, concise, and visually appealing format, using a card-like structure with a title, icon, and a numbered list of steps. The component also includes an "Offline" badge to indicate its availability.

## Architecture

This component resides within the `frontend/components/` directory and is part of the React component library. It is a presentational component, responsible for rendering the visual representation of first aid information. It receives data through props and does not manage any internal state or interact directly with the application's data fetching or state management logic. It is designed to be used within other components to display first aid instructions retrieved from the application's data sources (likely from the backend via API calls). It leverages Next.js for server-side rendering and client-side interactivity.

## Key Classes/Functions

