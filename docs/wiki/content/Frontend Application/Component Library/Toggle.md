```markdown
# Toggle Component - SafeVixAI

## Overview

The `Toggle` component provides a customizable and accessible toggle switch for use within the SafeVixAI dashboard. It allows users to visually represent and interact with boolean states, such as enabling or disabling features. The component leverages Tailwind CSS for styling and provides accessibility features through the use of `aria-label`.

## Architecture

This component resides within the frontend application's component library, specifically under the `dashboard` directory. It is a presentational component, meaning it primarily focuses on rendering UI elements and handling user interactions related to the toggle's state. It receives its state (`checked`) and a callback function (`onChange`) from its parent component. It interacts directly with the user through the checkbox input. It is part of the Next.js frontend, utilizing Supabase Auth for user authentication and interacting with the FastAPI backend for data retrieval and processing.

## Key Classes/Functions

