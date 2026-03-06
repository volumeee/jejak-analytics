import { collect } from '../core/collector.js';

/** Get a meaningful path, using hash as path for hash-routed SPAs */
function getPerformancePath(): string {
  const hash = location.hash.replace('#', '');
  if (hash && hash !== '/') {
    return '/' + hash;
  }
  return location.pathname;
}

/** Collect Core Web Vitals using PerformanceObserver */
export function initPerformanceTracking(): void {
  // Wait for page to be fully loaded
  if (document.readyState === 'complete') {
    collectMetrics();
  } else {
    window.addEventListener('load', () => {
      // Delay to capture post-load metrics (LCP, CLS)
      setTimeout(collectMetrics, 3000);
    });
  }
}

function collectMetrics(): void {
  const metrics: Record<string, number | null> = {
    lcp: null,
    fid: null,
    inp: null,
    cls: null,
    fcp: null,
    ttfb: null,
  };

  // ── TTFB ──────────────────────────────────────
  try {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navEntry) {
      metrics.ttfb = Math.round(navEntry.responseStart - navEntry.requestStart);
    }
  } catch { /* unsupported */ }

  // ── FCP ───────────────────────────────────────
  try {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');
    if (fcp) metrics.fcp = Math.round(fcp.startTime);
  } catch { /* unsupported */ }

  // ── LCP (Largest Contentful Paint) ─────────────
  observeMetric('largest-contentful-paint', (entry) => {
    metrics.lcp = Math.round(entry.startTime);
  });

  // ── FID (First Input Delay) ────────────────────
  observeMetric('first-input', (entry) => {
    metrics.fid = Math.round((entry as PerformanceEventTiming).processingStart - entry.startTime);
  });

  // ── CLS (Cumulative Layout Shift) ──────────────
  let clsValue = 0;
  observeMetric('layout-shift', (entry) => {
    if (!(entry as any).hadRecentInput) {
      clsValue += (entry as any).value;
      metrics.cls = Math.round(clsValue * 1000) / 1000;
    }
  });

  // Send metrics after collecting for 5 seconds
  setTimeout(() => {
    // Only send if we have at least one metric
    if (Object.values(metrics).some(v => v !== null)) {
      collect({
        type: 'performance',
        url: location.href,
        path: getPerformancePath(),
        ...metrics,
      });
    }
  }, 5000);
}

function observeMetric(type: string, callback: (entry: PerformanceEntry) => void): void {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        callback(entries[entries.length - 1]);
      }
    });
    observer.observe({ type, buffered: true });
  } catch {
    // PerformanceObserver not supported for this type
  }
}
