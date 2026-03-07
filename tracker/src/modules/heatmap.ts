import { collect } from '../core/collector.js';

let enabled = false;

/** Get a meaningful path, using hash as path for hash-routed SPAs (mirrors pageview.ts) */
function getHeatmapPath(): string {
  const hash = location.hash.replace('#', '');
  if (hash && hash !== '/') {
    return '/' + hash;
  }
  return location.pathname;
}

export function initHeatmapTracking(): void {
  if (enabled) return;
  enabled = true;

  // Synchronize dynamic document height with parent if running inside Jejak Dashboard
  if (window.parent !== window) {
    const reportHeight = () => {
      window.parent.postMessage({
        type: 'jejak_iframe_height',
        height: document.documentElement.scrollHeight
      }, '*');
    };
    window.addEventListener('load', reportHeight);
    window.addEventListener('resize', reportHeight);
    setInterval(reportHeight, 2000); // Fail-safe for SPAs
    reportHeight();
  }

  // Track clicks
  document.addEventListener('click', (e) => {
    // Robust coordinate system: Y is absolute from top, X is relative to screen center.
    // This allows SQL grouping to work regardless of the user's monitor width.
    const xPos = Math.round(e.pageX - (window.innerWidth / 2));
    const yPos = Math.round(e.pageY);

    // Generate a simple CSS selector for the clicked element
    const selector = getSelector(e.target as HTMLElement);

    collect({
      type: 'heatmap',
      url: location.href,
      path: getHeatmapPath(),
      eventType: 'click',
      x: xPos,
      y: Math.max(2, yPos), // Ensure Y > 1.5 so Dashboard knows it's the new pixel format
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      elementSelector: selector,
    });
  }, { passive: true });

  // Track scroll depth (throttled — only on scroll end)
  let scrollTimeout: ReturnType<typeof setTimeout>;
  let maxScrollY = 0;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY + window.innerHeight;
    if (scrollY > maxScrollY) maxScrollY = scrollY;

    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const scrollPercent = maxScrollY / document.documentElement.scrollHeight;

      collect({
        type: 'heatmap',
        url: location.href,
        path: getHeatmapPath(),
        eventType: 'scroll',
        x: 0,
        y: Math.max(2, Math.round(maxScrollY)), // Mark as new format
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });
    }, 1500); // Only send after 1.5s of no scrolling
  }, { passive: true });
}

function getSelector(el: HTMLElement | null): string {
  if (!el || el === document.documentElement) return 'html';
  if (el === document.body) return 'body';

  let selector = el.tagName.toLowerCase();

  if (el.id) {
    return `#${el.id}`;
  }

  if (el.className && typeof el.className === 'string') {
    const classes = el.className.trim().split(/\s+/).filter(Boolean).slice(0, 3);
    if (classes.length) {
      selector += '.' + classes.join('.');
    }
  }

  // Include parent for context if not too deep
  const parent = el.parentElement;
  if (parent && parent !== document.body && parent !== document.documentElement) {
    const parentTag = parent.tagName.toLowerCase();
    const parentId = parent.id ? `#${parent.id}` : '';
    return `${parentTag}${parentId} > ${selector}`.substring(0, 100);
  }

  return selector.substring(0, 100);
}

