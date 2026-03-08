/**
 * Sentry Error Tracking Configuration (T243)
 * Monitors and reports application errors in production
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
    // Adjust this in production to avoid high costs
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Session replay for debugging
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Performance monitoring
    integrations: [
      new Sentry.BrowserTracing({
        tracePropagationTargets: [
          'localhost',
          /^https:\/\/.*\.easy-eng\.com/,
        ],
      }),
      new Sentry.Replay(),
    ],

    // Filter sensitive data
    beforeSend(event: any, hint: any) {
      // Don't send errors in development
      if (ENVIRONMENT === 'development') {
        return null;
      }

      // Filter out specific errors
      if (event.exception) {
        const error = hint.originalException;
        if (error && typeof error === 'object' && 'message' in error) {
          const message = String(error.message);
          // Ignore network errors
          if (message.includes('Network') || message.includes('fetch')) {
            return null;
          }
        }
      }

      // Remove sensitive data from event
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      if (event.request?.headers) {
        delete event.request.headers.Authorization;
        delete event.request.headers.Cookie;
      }

      return event;
    },
  });
}

// Helper to capture custom errors
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

// Helper to capture custom messages
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

// Set user context for better debugging
export function setUserContext(user: { id: string; email?: string; role?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

// Clear user context on logout
export function clearUserContext() {
  Sentry.setUser(null);
}
