/**
 * ╔═══════════════════════════════════════════════════╗
 * ║            Jejak — Tracker Script                 ║
 * ║    Lightweight, privacy-first web analytics       ║
 * ╚═══════════════════════════════════════════════════╝
 *
 * Usage (Script Tag):
 *   <script defer src="https://your-server/jejak.js"
 *           data-website-id="YOUR_ID"
 *           data-api="https://your-server"></script>
 *
 * Usage (Module):
 *   import { init, track } from '@jejak/tracker'
 *   init({ websiteId: 'xxx', apiUrl: 'https://...' })
 *   track('button_click', { label: 'Download' })
 */

import { generateFingerprint } from './core/fingerprint.js';
import { initCollector, collect } from './core/collector.js';
import { initPageviewTracking } from './modules/pageview.js';
import { track, initEventTracking } from './modules/events.js';
import { initHeatmapTracking } from './modules/heatmap.js';
import { initPerformanceTracking } from './modules/performance.js';
import { initErrorTracking } from './modules/errors.js';
import { initSessionRecording } from './modules/session.js';
import { initABTracking, getVariant } from './modules/abtest.js';

interface InitOptions {
  websiteId: string;
  apiUrl?: string;
  heatmap?: boolean;
  performance?: boolean;
  errorTracking?: boolean;
  sessionRecording?: boolean;
  sessionSampleRate?: number;
}

let initialized = false;

function init(options: InitOptions): void {
  if (initialized) return;

  // Respect Do Not Track
  if (navigator.doNotTrack === '1') return;

  const apiUrl = options.apiUrl || getScriptApiUrl();
  if (!apiUrl || !options.websiteId) return;

  initialized = true;
  const fingerprint = generateFingerprint();

  // Initialize collector (event queue + batching)
  initCollector({ apiUrl, websiteId: options.websiteId, fingerprint });
  
  // Set global state for modules
  const globalState = {
    apiUrl,
    websiteId: options.websiteId
  };
  (window as any).Jejak = { ...(window as any).Jejak, ...globalState };

  // Core: page view tracking (always on)
  initPageviewTracking();

  // Core: declarative event tracking (always on)
  initEventTracking();

  // Optional modules
  if (options.heatmap !== false) initHeatmapTracking();
  if (options.performance !== false) initPerformanceTracking();
  if (options.errorTracking !== false) initErrorTracking();
  if (options.sessionRecording) {
    initSessionRecording({ sampleRate: options.sessionSampleRate });
  }
  
  // A/B Testing
  initABTracking();
}

/** Get API URL from the script tag's data-api attribute or same origin */
function getScriptApiUrl(): string {
  const scripts = document.querySelectorAll('script[data-website-id]');
  const script = scripts[scripts.length - 1];

  if (script) {
    const dataApi = script.getAttribute('data-api');
    if (dataApi) return dataApi;

    // Default: use the script's origin
    try {
      const url = new URL(script.getAttribute('src') || '');
      return url.origin;
    } catch { /* ignore */ }
  }

  return '';
}

// ── Auto-init from script tag ────────────────────
(function autoInit() {
  const script = document.currentScript || document.querySelector('script[data-website-id]');

  if (script) {
    const websiteId = script.getAttribute('data-website-id');
    if (websiteId) {
      init({
        websiteId,
        apiUrl: script.getAttribute('data-api') || undefined,
        heatmap: script.getAttribute('data-heatmap') !== 'false',
        performance: script.getAttribute('data-performance') !== 'false',
        errorTracking: script.getAttribute('data-errors') !== 'false',
        sessionRecording: script.getAttribute('data-recording') === 'true',
        sessionSampleRate: parseFloat(script.getAttribute('data-sample-rate') || '0.1'),
      });
    }
  }
})();

// ── Public API ───────────────────────────────────
export { init, track, collect, getVariant };
export default { init, track, collect, getVariant };
