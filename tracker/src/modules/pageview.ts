import { collect } from '../core/collector.js';

let lastUrl = '';

export function initPageviewTracking(): void {
  // Track initial page view
  trackPageview();

  // SPA: listen for history changes
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    onUrlChange();
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    onUrlChange();
  };

  window.addEventListener('popstate', onUrlChange);
  window.addEventListener('hashchange', () => {
    // Immediate tracking for hash changes
    trackPageview();
  });

  // Intercept anchor clicks for hash-routed sections
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest('a');
    if (el && el.getAttribute('href')?.startsWith('#')) {
      // Small delay to let browser update hash or Vue process navigation
      setTimeout(onUrlChange, 50);
    }
  }, { passive: true });
}

let trackingTimer: ReturnType<typeof setTimeout> | null = null;
function onUrlChange(): void {
  if (trackingTimer) clearTimeout(trackingTimer);
  trackingTimer = setTimeout(() => {
    if (getFullUrl() !== lastUrl) {
      trackPageview();
    }
  }, 100);
}

/** Get full URL including hash for SPAs using hash routing */
function getFullUrl(): string {
  return location.href;
}

/** Get a meaningful path, using hash as path for hash-routed SPAs */
function getPath(): string {
  const hash = location.hash.replace('#', '');
  // If there's a meaninful hash (not empty), use it as the path
  if (hash && hash !== '/') {
    return '/' + hash;
  }
  return location.pathname;
}

function trackPageview(): void {
  lastUrl = getFullUrl();

  collect({
    type: 'pageview',
    url: location.href,
    path: getPath(),
    title: document.title,
    referrer: document.referrer || undefined,
  });
}
