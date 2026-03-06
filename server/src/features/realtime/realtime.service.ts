import { WebSocket } from 'ws';

// Active WebSocket connections per website
const connections = new Map<string, Set<WebSocket>>();

// Active visitors tracked in-memory (fingerprint → last seen timestamp)
const activeVisitors = new Map<string, Map<string, number>>();

const ACTIVE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/** Register a WebSocket client for a website */
export function addRealtimeClient(websiteId: string, ws: WebSocket): void {
  if (!connections.has(websiteId)) {
    connections.set(websiteId, new Set());
  }
  connections.get(websiteId)!.add(ws);

  // Send current active count immediately
  const count = getActiveVisitorCount(websiteId);
  ws.send(JSON.stringify({ type: 'activeVisitors', count }));

  ws.on('close', () => {
    connections.get(websiteId)?.delete(ws);
    if (connections.get(websiteId)?.size === 0) {
      connections.delete(websiteId);
    }
  });
}

/** Broadcast real-time data to all connected dashboard clients */
export function broadcastRealtime(websiteId: string, data: any): void {
  // Track active visitor
  if (data.sessionId) {
    if (!activeVisitors.has(websiteId)) {
      activeVisitors.set(websiteId, new Map());
    }
    activeVisitors.get(websiteId)!.set(data.sessionId, Date.now());
  }

  const clients = connections.get(websiteId);
  if (!clients || clients.size === 0) return;

  const message = JSON.stringify({
    ...data,
    activeVisitors: getActiveVisitorCount(websiteId),
    timestamp: Date.now(),
  });

  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

/** Get active visitor count for a website */
export function getActiveVisitorCount(websiteId: string): number {
  const visitors = activeVisitors.get(websiteId);
  if (!visitors) return 0;

  const now = Date.now();
  let count = 0;

  for (const [key, lastSeen] of visitors.entries()) {
    if (now - lastSeen > ACTIVE_TIMEOUT) {
      visitors.delete(key);
    } else {
      count++;
    }
  }

  return count;
}

// Clean up stale visitors periodically
setInterval(() => {
  const now = Date.now();
  for (const [, visitors] of activeVisitors) {
    for (const [key, lastSeen] of visitors) {
      if (now - lastSeen > ACTIVE_TIMEOUT) {
        visitors.delete(key);
      }
    }
  }
}, 60_000);
