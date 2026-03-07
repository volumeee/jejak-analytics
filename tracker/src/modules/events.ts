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
 * Usage: <button data-jj-event="download_click" data-jj-url="/download">Download</button>
 */
export function initEventTracking(): void {
  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('[data-jj-event]');
    if (target) {
      const name = target.getAttribute('data-jj-event')!;
      const props: Record<string, string> = {};

      // Collect all data-jj-* attributes as properties
      for (const attr of Array.from(target.attributes)) {
        if (attr.name.startsWith('data-jj-') && attr.name !== 'data-jj-event') {
          const key = attr.name.replace('data-jj-', '');
          props[key] = attr.value;
        }
      }

      track(name, props);
    }
  }, { capture: true });
}
