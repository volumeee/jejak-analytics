interface QueuedEvent {
  type: string;
  [key: string]: any;
}

let queue: QueuedEvent[] = [];
let apiUrl = '';
let websiteId = '';
let fingerprint = '';
let sessionId = '';
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isUnloading = false;

const FLUSH_INTERVAL = 3000; // 3 seconds for more responsive real-time
const MAX_BATCH_SIZE = 50;

export function initCollector(opts: { apiUrl: string; websiteId: string; fingerprint: string }): void {
  apiUrl = opts.apiUrl;
  websiteId = opts.websiteId;
  fingerprint = opts.fingerprint;

  // Auto-flush on visibility change (user leaving page)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      isUnloading = true;
      flush();
    } else {
      isUnloading = false;
    }
  });

  // Auto-flush on page unload
  window.addEventListener('beforeunload', () => {
    isUnloading = true;
    flush();
  });

  // Start periodic flush
  scheduleFlush();
}

export function collect(event: QueuedEvent): void {
  queue.push(event);

  if (queue.length >= MAX_BATCH_SIZE) {
    flush();
  }
}

// session id is managed internally and via getSessionId/waitForSessionId below

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flush();
    scheduleFlush();
  }, FLUSH_INTERVAL);
}

function flush(): void {
  if (queue.length === 0) return;

  const batch = queue.splice(0, MAX_BATCH_SIZE);
  const payloadJson = JSON.stringify({
    websiteId,
    fingerprint,
    sessionId: sessionId || undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenWidth: screen.width,
    screenHeight: screen.height,
    language: navigator.language,
    payload: batch,
  });

  const b64 = typeof btoa !== 'undefined' ? btoa(unescape(encodeURIComponent(payloadJson))) : '';
  const payload = JSON.stringify({ d: b64 });

  // Use sendBeacon only on page unload (can't get response but reliable)
  // Use fetch for normal flushes (to get sessionId back)
  if (isUnloading && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon(`${apiUrl}/api/v1/ping`, blob);
  } else {
    fetchSend(payload);
  }
}

let sessionIdResolvers: ((id: string) => void)[] = [];

export function getSessionId(): string {
  return sessionId || localStorage.getItem('jj_session_id') || '';
}

/** 
 * Returns a promise that resolves when a sessionId is available
 */
export async function waitForSessionId(): Promise<string> {
  const current = getSessionId();
  if (current) return current;

  return new Promise((resolve) => {
    sessionIdResolvers.push(resolve);
    // Timeout after 5 seconds to not hang forever
    setTimeout(() => {
      const idx = sessionIdResolvers.indexOf(resolve);
      if (idx > -1) sessionIdResolvers.splice(idx, 1);
      resolve('');
    }, 5000);
  });
}

function fetchSend(payload: string): void {
  fetch(`${apiUrl}/api/v1/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).then(res => {
    if (res.ok) {
      res.json().then(data => {
        if (data.sessionId) {
          sessionId = data.sessionId;
          localStorage.setItem('jj_session_id', sessionId);
          // Resolve waiters
          const resolvers = [...sessionIdResolvers];
          sessionIdResolvers = [];
          resolvers.forEach(r => r(sessionId));
        }
      }).catch(() => {});
    }
  }).catch(() => {
    // Silently fail
  });
}
