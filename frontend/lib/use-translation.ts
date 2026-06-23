// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

'use client';

import { useTranslation as useTrans } from 'react-i18next';

export function useTranslation(ns?: string | string[], options?: Record<string, unknown>) {
  return useTrans(ns, options);
}
