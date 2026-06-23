// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

// frontend/lib/haptics.ts
// Haptic feedback utility - surgical vibration for safety-critical moments only

export const haptics = {
  // Light tap - button press
  light: () => navigator.vibrate?.(10),

  // Medium - successful action (report submitted, SOS sent)
  medium: () => navigator.vibrate?.(30),

  // Heavy - crash detected, SOS activated
  heavy: () => navigator.vibrate?.([100, 50, 100]),

  // SOS pattern - morse code for SOS: ... --- ...
  sos: () =>
    navigator.vibrate?.([
      100, 50, 100, 50, 100, // S (3 short)
      200, 200, 50, 200, 50, 200, // O (3 long)
      200, 50, 100, 50, 100, 50, 100, // S (3 short)
    ]),

  // Warning - error, failed action
  warning: () => navigator.vibrate?.([50, 30, 50]),
};
