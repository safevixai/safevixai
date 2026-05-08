```markdown
# utils.ts

## Overview

The `utils.ts` module provides utility functions for the frontend application of SafeVixAI. It primarily focuses on simplifying and streamlining the management of CSS classes using `clsx` and `tailwind-merge` libraries for Tailwind CSS.

## Architecture

This module resides within the `frontend/lib` directory and is a foundational component of the frontend application. It's used by various React components throughout the application to manage CSS class names, ensuring consistent styling and efficient class merging. It doesn't interact directly with the LLM providers, Supabase Auth, or the backend (FastAPI).

## Key Classes/Functions

| Name | Params | Return | Description |
|---|---|---|---|
| `cn` | `...inputs: ClassValue[]` | `string` | A utility function that merges CSS class names. It uses `clsx` to conditionally apply classes and `tailwind-merge` to optimize Tailwind CSS class combinations, preventing conflicts and reducing the final CSS bundle size. |

## Dependencies (imports)

*   `clsx`: A utility for conditionally joining class names together.
*   `tailwind-merge`: A utility for intelligently merging Tailwind CSS classes.
*   `ClassValue`: Type from `clsx` for the input parameters of `cn`.

## Configuration

This module does not require any environment variables or configuration constants.

## Usage Examples

```typescript
import { cn } from "@/lib/utils"

// Applying a default class and a conditional class
const buttonClasses = cn(
  "bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded",
  "disabled:opacity-50",
  {
    "cursor-not-allowed": isDisabled,
  }
);

// Using the function in a React component
function MyButton({ children, isDisabled }: { children: React.ReactNode, isDisabled: boolean }) {
  return (
    <button className={buttonClasses} disabled={isDisabled}>
      {children}
    </button>
  );
}
```

## Error Handling

This module itself does not contain any explicit error handling. The functions it uses (`clsx` and `tailwind-merge`) are designed to handle potential issues internally, such as invalid class names, without throwing errors that need to be explicitly caught within this module. Any issues related to CSS class application are handled by the browser's rendering engine.

## Related Modules

*   Any React components within the `frontend/app` directory that utilize Tailwind CSS.
```