// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import i18n from './i18n';

/**
 * Get current BCP-47 locale from i18next
 */
export function getLocale(): string {
  const lang = i18n.language || 'en';
  // Map i18next codes to BCP-47 with IN/PK region for appropriate South Asian context
  const localeMap: Record<string, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    mr: 'mr-IN',
    gu: 'gu-IN',
    bn: 'bn-IN',
    pa: 'pa-IN',
    ur: 'ur-PK',
    ar: 'ar-AE',
    es: 'es-ES',
    fr: 'fr-FR',
  };
  return localeMap[lang] || 'en-IN';
}

/**
 * Formats a generic number with grouping separators according to the current locale.
 */
export function formatNumber(n: number): string {
  try {
    return new Intl.NumberFormat(getLocale()).format(n);
  } catch (_e) {
    return n.toLocaleString();
  }
}

/**
 * Formats a currency amount in Indian Rupees (INR) with the appropriate locale symbol.
 */
export function formatCurrency(amount: number): string {
  try {
    return new Intl.NumberFormat(getLocale(), {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0, // In India we rarely display paisa for challans/fines
    }).format(amount);
  } catch (_e) {
    return `₹${amount}`;
  }
}

/**
 * Formats a number to specific decimal places using the current locale's numbering system.
 */
export function formatDecimal(n: number, decimals = 1): string {
  try {
    return new Intl.NumberFormat(getLocale(), {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  } catch (_e) {
    return n.toFixed(decimals);
  }
}

/**
 * Formats large values using localized compact notations (Crore, Lakh, Thousand/K).
 */
export function formatCompactNumber(n: number): string {
  if (n >= 10000000) {
    const val = n / 10000000;
    return `${formatDecimal(val, val % 1 === 0 ? 0 : 1)} Cr`;
  }
  if (n >= 100000) {
    const val = n / 100000;
    return `${formatDecimal(val, val % 1 === 0 ? 0 : 1)} L`;
  }
  if (n >= 1000) {
    const val = n / 1000;
    return `${formatDecimal(val, val % 1 === 0 ? 0 : 1)} K`;
  }
  return formatNumber(n);
}

/**
 * Formats distances in a localized manner (meters or kilometers).
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${formatDecimal(km, 1)} km`;
  }
  return `${formatDecimal(meters, 0)} m`;
}

/**
 * Formats duration in seconds to a user-friendly hr/min/sec string.
 */
export function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
  }
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    return `${m} min`;
  }
  return `${seconds} sec`;
}

/**
 * Formats a coordinate pair (lat, lon) for user display.
 */
export function formatCoordinate(lat: number, lon: number): string {
  return `${formatDecimal(lat, 4)}, ${formatDecimal(lon, 4)}`;
}

/**
 * Parses a Date or date string safely.
 */
function parseDate(date: Date | string | number): Date {
  if (date instanceof Date) return date;
  return new Date(date);
}

/**
 * Formats a date to a localized medium date format (e.g., "24 May 2026").
 */
export function formatDate(date: Date | string | number): string {
  try {
    return new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium' }).format(parseDate(date));
  } catch (_e) {
    return parseDate(date).toDateString();
  }
}

/**
 * Formats a time to a localized short time format (e.g., "12:30 PM").
 */
export function formatTime(date: Date | string | number): string {
  try {
    return new Intl.DateTimeFormat(getLocale(), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(parseDate(date));
  } catch (_e) {
    return parseDate(date).toTimeString().substring(0, 5);
  }
}

/**
 * Formats a datetime to a localized medium date + short time.
 */
export function formatDateTime(date: Date | string | number): string {
  try {
    return new Intl.DateTimeFormat(getLocale(), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parseDate(date));
  } catch (_e) {
    const d = parseDate(date);
    return `${d.toDateString()} ${d.toTimeString().substring(0, 5)}`;
  }
}

/**
 * Formats a date relative to now (e.g., "5 minutes ago", "yesterday").
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = parseDate(date);
  const now = new Date();
  const elapsedMs = d.getTime() - now.getTime();
  const elapsedSec = Math.round(elapsedMs / 1000);

  // Define division units
  const units: Array<{ name: Intl.RelativeTimeFormatUnit; seconds: number }> = [
    { name: 'year', seconds: 31536000 },
    { name: 'month', seconds: 2592000 },
    { name: 'week', seconds: 604800 },
    { name: 'day', seconds: 86400 },
    { name: 'hour', seconds: 3600 },
    { name: 'minute', seconds: 60 },
    { name: 'second', seconds: 1 },
  ];

  try {
    const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
    for (const unit of units) {
      if (Math.abs(elapsedSec) >= unit.seconds || unit.name === 'second') {
        const value = Math.round(elapsedSec / unit.seconds);
        return rtf.format(value, unit.name);
      }
    }
  } catch (_e) {
    // Fallback if RelativeTimeFormat is not fully supported
    const absSec = Math.abs(elapsedSec);
    if (absSec < 60) return 'just now';
    if (absSec < 3600) return `${Math.round(absSec / 60)} min ago`;
    if (absSec < 86400) return `${Math.round(absSec / 3600)} hr ago`;
    return d.toLocaleDateString();
  }

  return d.toLocaleDateString();
}
