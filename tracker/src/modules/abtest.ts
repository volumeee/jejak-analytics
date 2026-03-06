import { waitForSessionId } from '../core/collector.js';

// A/B Testing Module

interface Variant {
  name: string;
  weight: number;
}

const assignments: Record<string, string> = {};

/**
 * A/B Testing Module
 * 
 * Fetches variant assignments from the server and caches them.
 */
export async function getVariant(testId: string): Promise<string | null> {
  if (assignments[testId]) return assignments[testId];

  try {
    const sessionId = await waitForSessionId();
    if (!sessionId) return null;

    const apiUrl = (window as any).Jejak?.apiUrl || (window as any).PosinAnalytics?.apiUrl || '';
    if (!apiUrl) return null;

    const res = await fetch(`${apiUrl}/api/ab-tests/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId, sessionId }),
    });

    if (!res.ok) return null;
    
    const { variant } = await res.json();
    assignments[testId] = variant;
    return variant;
  } catch (e) {
    console.error('[AB] Failed to get variant:', e);
    return null;
  }
}

/**
 * Automatically handle data-jj-ab-test / data-pa-ab-test attributes on elements.
 */
export async function initABTracking(): Promise<void> {
  // Initial run
  processElements();

  // Watch for dynamically added elements (SPAs)
  const observer = new MutationObserver(() => processElements());
  observer.observe(document.body, { childList: true, subtree: true });

  // Fallback: poll every 2s for 10s (just in case)
  let count = 0;
  const interval = setInterval(() => {
    processElements();
    if (++count > 5) clearInterval(interval);
  }, 2000);
}

async function processElements() {
  const elements = document.querySelectorAll<HTMLElement>('[data-jj-ab-test]:not([data-jj-ab-processed]), [data-pa-ab-test]:not([data-pa-ab-processed])');
  if (elements.length === 0) return;

  for (const el of Array.from(elements)) {
    const testId = el.getAttribute('data-jj-ab-test') || el.getAttribute('data-pa-ab-test');
    if (!testId) continue;

    const variant = await getVariant(testId);
    if (!variant) continue;

    // Mark as processed so we don't handle it again
    el.setAttribute('data-jj-ab-processed', 'true');
    el.setAttribute('data-pa-ab-processed', 'true');

    const elementVariant = el.getAttribute('data-jj-ab-variant') || el.getAttribute('data-pa-ab-variant');
    if (elementVariant && elementVariant !== variant) {
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
    } else {
      // It matches! Show it (if it was hidden by default)
      if (el.style.display === 'none') {
        el.style.display = '';
      }
    }
  }
}
