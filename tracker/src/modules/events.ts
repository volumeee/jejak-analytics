import { collect } from '../core/collector.js';

/**
 * Track a custom event programmatically.
 * Usage: Jejak.track('button_click', { button: 'download' })
 */
export function track(name: string, properties?: Record<string, any>): void {
  collect({
    type: 'event',
    name,
    url: location.href,
    properties: properties || {},
  });
}

/**
 * Initialize declarative event tracking via data attributes.
 * Supports both data-jj-event and legacy data-pa-event.
 * Usage: <button data-jj-event="download_click" data-jj-url="/download">Download</button>
 */
export function initEventTracking(): void {
  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('[data-jj-event], [data-pa-event]');
    if (target) {
      const name = target.getAttribute('data-jj-event') || target.getAttribute('data-pa-event')!;
      const props: Record<string, string> = {};

      // Collect all data-jj-* and data-pa-* attributes as properties
      for (const attr of Array.from(target.attributes)) {
        if (attr.name.startsWith('data-jj-') && attr.name !== 'data-jj-event') {
          const key = attr.name.replace('data-jj-', '');
          props[key] = attr.value;
        } else if (attr.name.startsWith('data-pa-') && attr.name !== 'data-pa-event') {
          const key = attr.name.replace('data-pa-', '');
          props[key] = attr.value;
        }
      }

      track(name, props);
    }
  }, { capture: true });
}
