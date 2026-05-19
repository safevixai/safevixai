type LogDetail = unknown;

const isDevelopment = process.env.NODE_ENV !== 'production';
const sentryAvailable = typeof window !== 'undefined' && (window as any).Sentry;

function emit(level: 'error' | 'warn', message: string, detail?: LogDetail) {
  if (typeof globalThis === 'undefined') return;

  const sink = globalThis['console'];

  // OBSERVABILITY#3 FIX: Send errors to Sentry in production
  if (!isDevelopment && sentryAvailable) {
    try {
      const sentry = (window as any).Sentry;
      if (level === 'error') {
        sentry.captureException(detail instanceof Error ? detail : new Error(message), {
          extra: { detail, message },
          level: 'error',
        });
      } else if (level === 'warn') {
        sentry.captureMessage(message, {
          level: 'warning',
          extra: { detail },
        });
      }
    } catch {
      // Sentry not initialized — fall through to console
    }
  }

  // Always log to console in development
  if (isDevelopment && sink) {
    if (detail === undefined) {
      sink[level](message);
    } else {
      sink[level](message, detail);
    }
  }
}

export function logClientError(message: string, detail?: LogDetail) {
  emit('error', message, detail);
}

export function logClientWarning(message: string, detail?: LogDetail) {
  emit('warn', message, detail);
}
