import { collect } from '../core/collector.js';

export function initErrorTracking(): void {
  // Catch runtime JS errors
  window.addEventListener('error', (e) => {
    collect({
      type: 'error',
      message: e.message || 'Unknown error',
      source: e.filename || undefined,
      line: e.lineno || undefined,
      col: e.colno || undefined,
      stack: e.error?.stack || undefined,
      url: location.href,
    });
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    const message = e.reason instanceof Error
      ? e.reason.message
      : String(e.reason || 'Unhandled promise rejection');

    const stack = e.reason instanceof Error ? e.reason.stack : undefined;

    collect({
      type: 'error',
      message,
      stack,
      url: location.href,
    });
  });
}
