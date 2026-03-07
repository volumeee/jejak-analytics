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

  // Track clicks
  document.addEventListener('click', (e) => {
    const x = e.pageX / document.documentElement.scrollWidth;
    const y = e.pageY / document.documentElement.scrollHeight;

    // Generate a simple CSS selector for the clicked element
    const selector = getSelector(e.target as HTMLElement);

    collect({
      type: 'heatmap',
      url: location.href,
      path: getHeatmapPath(),
      eventType: 'click',
      x: Math.round(x * 10000) / 10000,
      y: Math.round(y * 10000) / 10000,
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
        y: Math.round(scrollPercent * 10000) / 10000,
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

