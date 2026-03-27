// Placeholder Sentry integration for Module 5.
// This is not wired into the application by default.

export interface SentryConfig {
  dsn: string;
}

let initialized = false;

export function initSentry(_config: SentryConfig) {
  // In a real deployment, call Sentry.init here.
  initialized = true;
}

export function captureError(error: unknown) {
  if (!initialized) return;
  // In a real deployment, forward the error to Sentry.
  // For now, we simply no-op to avoid side effects.
}
