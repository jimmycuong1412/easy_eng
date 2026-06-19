/**
 * Window interface extensions for third-party globals
 */

interface PlausibleFunction {
  (eventName: string, options?: { props?: Record<string, unknown> }): void;
}

interface GtagFunction {
  (command: string, ...args: unknown[]): void;
}

interface SentryGlobal {
  captureException(error: unknown, context?: { extra?: Record<string, unknown> }): void;
  captureMessage(message: string): void;
}

interface Window {
  plausible?: PlausibleFunction;
  gtag?: GtagFunction;
  Sentry?: SentryGlobal;
  webkitAudioContext?: typeof AudioContext;
}
