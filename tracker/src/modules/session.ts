import { collect } from '../core/collector.js';

let recording = false;

/**
 * Session recording placeholder.
 * In production, integrate rrweb here by adding it as a dependency.
 *
 * For now, this provides the infrastructure — rrweb can be loaded on-demand
 * to keep the base tracker script tiny.
 */
export function initSessionRecording(opts: { sampleRate?: number } = {}): void {
  if (recording) return;

  const sampleRate = opts.sampleRate ?? 0.1; // Default: record 10% of sessions

  // Random sampling — only record some sessions
  if (Math.random() > sampleRate) return;

  recording = true;

  // Dynamically load rrweb to keep base tracker small
  loadRrweb().then((rrweb) => {
    if (!rrweb) return;

    const events: any[] = [];
    let chunkTimer: ReturnType<typeof setInterval>;

    rrweb.record({
      emit(event: any) {
        events.push(event);

        // Send in chunks of 50 events to avoid memory buildup
        if (events.length >= 50) {
          flushRecording(events.splice(0, 50));
        }
      },
      maskAllInputs: true,
      blockClass: 'jj-block', // Elements with class "jj-block" won't be recorded
      ignoreClass: 'jj-block',
      sampling: {
        mousemove: false,    // Don't record mouse movement (too much data)
        mouseInteraction: true,
        scroll: 150,         // Sample scroll events every 150ms
        input: 'last',       // Only record last input value
      },
    });

    // Flush remaining events periodically
    chunkTimer = setInterval(() => {
      if (events.length > 0) {
        flushRecording(events.splice(0));
      }
    }, 10000);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(chunkTimer);
      if (events.length > 0) {
        flushRecording(events.splice(0));
      }
    });
  });
}

function flushRecording(events: any[]): void {
  collect({
    type: 'recording',
    events,
  });
}

async function loadRrweb(): Promise<any | null> {
  try {
    // Dynamically load rrweb via script tag to keep base tracker small
    return await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const apiUrl = (window as any)._cfg?.apiUrl || '';
      script.src = `${apiUrl}/lib/telemetry.js`;
      script.onload = () => resolve((window as any).telemetry);
      script.onerror = () => reject(new Error('Failed to load telemetry'));
      document.head.appendChild(script);
    });
  } catch {
    // rrweb not available — session recording disabled
    return null;
  }
}
