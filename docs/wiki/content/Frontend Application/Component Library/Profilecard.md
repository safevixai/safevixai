```markdown
# ProfileCard.tsx

## Overview

`ProfileCard.tsx` is a React component within the SafeVixAI frontend application that displays a user's profile information in a visually appealing card format. It renders the user's name (or a default placeholder), initials, and key emergency contact details such as blood group, vehicle ID, and emergency contact number. The component leverages the `useAppStore` hook to access and display user profile data.

## Architecture

This component resides within the `frontend/components/dashboard/` directory and is part of the frontend application's component library. It is a presentational component, responsible for rendering user profile data retrieved from the application's state management using `useAppStore`. The component is designed to be reusable and is integrated within the dashboard layout to provide quick access to user's emergency information. It utilizes styling from Tailwind CSS for its visual presentation.

## Key Classes/Functions

