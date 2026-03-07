<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { useWebsiteStore } from "../stores/index";
import { api } from "../lib/api";

const ws = useWebsiteStore();
const activeVisitors = ref(0);
const recentPages = ref<any[]>([]);
const connectionStatus = ref<"connecting" | "connected" | "disconnected">(
  "disconnected",
);
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function connect() {
  if (!ws.currentId) return;

  connectionStatus.value = "connecting";

  // WebSocket connects to the server (port 3100), not the dashboard
  const serverHost = import.meta.env.VITE_WS_URL || "ws://localhost:3100";
  const wsUrl = `${serverHost}/ws?websiteId=${ws.currentId}`;

  try {
    socket = new WebSocket(wsUrl);
  } catch {
    connectionStatus.value = "disconnected";
    scheduleReconnect();
    return;
  }

  socket.onopen = () => {
    connectionStatus.value = "connected";
  };

  socket.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);

      // Handle initial active count message: { type: 'activeVisitors', count: N }
      if (data.type === "activeVisitors" && data.count !== undefined) {
        activeVisitors.value = data.count;
        return;
      }

      // Handle broadcast messages: { activeVisitors: N, ...data }
      if (data.activeVisitors !== undefined) {
        activeVisitors.value = data.activeVisitors;
      }

      // Handle pageview events
      if (data.type === "pageview") {
        recentPages.value.unshift({
          ...data,
          time: new Date().toLocaleTimeString(),
        });
        if (recentPages.value.length > 50) recentPages.value.pop();
      }
    } catch {
      /* ignore */
    }
  };

  socket.onclose = () => {
    connectionStatus.value = "disconnected";
    scheduleReconnect();
  };

  socket.onerror = () => {
    connectionStatus.value = "disconnected";
  };
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connect, 3000);
}

function disconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  socket?.close();
  socket = null;
}

// Also poll the overview API for active visitors as a fallback
async function pollActiveVisitors() {
  if (!ws.currentId) return;
  try {
    const now = new Date().toISOString().split("T")[0];
    const res = await api.get("/stats/overview", {
      params: { websiteId: ws.currentId, start: now, end: now },
    });
    if (res.data.overview?.activeVisitors !== undefined) {
      activeVisitors.value = Math.max(
        activeVisitors.value,
        res.data.overview.activeVisitors,
      );
    }
  } catch {
    /* ignore */
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

watch(
  () => ws.currentId,
  () => {
    disconnect();
    recentPages.value = [];
    activeVisitors.value = 0;
    connect();
    pollActiveVisitors();
  },
);

onMounted(() => {
  connect();
  pollActiveVisitors();
  pollTimer = setInterval(pollActiveVisitors, 15000);
});

onUnmounted(() => {
  disconnect();
  if (pollTimer) clearInterval(pollTimer);
});

function getFlagEmoji(countryCode: string) {
  if (!countryCode) return "🌐";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getDeviceIcon(device: string) {
  switch (device?.toLowerCase()) {
    case "mobile":
      return "📱";
    case "tablet":
      return "Tablet";
    case "smarttv":
      return "📺";
    default:
      return "💻";
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Active now card -->
    <div
      class="relative overflow-hidden bg-gradient-to-r from-emerald-600/20 via-emerald-500/10 to-primary-600/20 border border-emerald-500/20 rounded-2xl p-8 text-center"
    >
      <!-- Background pulse effect -->
      <div
        class="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent animate-pulse-glow"
      ></div>

      <div class="relative">
        <div class="text-7xl font-bold text-dark-100 mb-2 stat-number">
          {{ activeVisitors }}
          <span
            class="inline-block w-3.5 h-3.5 rounded-full animate-pulse ml-2 -translate-y-1"
            :class="
              connectionStatus === 'connected'
                ? 'bg-emerald-400'
                : connectionStatus === 'connecting'
                  ? 'bg-amber-400'
                  : 'bg-red-400'
            "
          ></span>
        </div>
        <p class="text-dark-400 text-sm">Active visitors right now</p>
        <p class="text-dark-600 text-xs mt-1">
          {{
            connectionStatus === "connected"
              ? "🟢 Connected to real-time stream"
              : connectionStatus === "connecting"
                ? "🟡 Connecting..."
                : "🔴 Disconnected — retrying"
          }}
        </p>
      </div>
    </div>

    <!-- Live activity feed -->
    <div class="glass-card p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-dark-200">Live Activity Feed</h3>
        <span v-if="recentPages.length" class="text-xs text-dark-500"
          >{{ recentPages.length }} events logged</span
        >
      </div>
      <div class="space-y-2">
        <transition-group name="slide" tag="div">
          <div
            v-for="(page, i) in recentPages"
            :key="page.time + i"
            class="flex items-center justify-between py-3 px-4 rounded-xl bg-dark-800/30 text-sm group hover:bg-dark-800/50 transition-all border border-transparent hover:border-dark-700/50"
          >
            <div class="flex items-center gap-3">
              <span class="text-lg" :title="page.country">{{
                getFlagEmoji(page.country)
              }}</span>
              <div class="flex flex-col">
                <div class="flex items-center gap-2">
                  <span class="text-dark-200 font-medium">
                    {{ getDeviceIcon(page.device) }}
                    <span class="text-dark-500 font-mono text-xs ml-1">{{
                      page.sessionId?.substring(0, 8) || "Anonymous"
                    }}</span>
                  </span>
                  <span class="text-dark-500 text-xs">viewed</span>
                  <span
                    class="text-primary-400 font-mono text-[11px] truncate max-w-[200px]"
                    >{{ page.path || "/" }}</span
                  >
                </div>
                <div
                  v-if="page.pageViews > 1 || page.events > 0"
                  class="flex gap-2 mt-1"
                >
                  <span
                    v-if="page.pageViews > 1"
                    class="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider"
                  >
                    {{ page.pageViews }} Page Views
                  </span>
                  <span
                    v-if="page.events > 0"
                    class="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-bold uppercase tracking-wider"
                  >
                    {{ page.events }} Custom Events
                  </span>
                </div>
              </div>
            </div>
            <div class="flex flex-col items-end">
              <span class="text-dark-400 text-[10px] font-medium">{{
                page.time
              }}</span>
            </div>
          </div>
        </transition-group>
        <div v-if="!recentPages.length" class="text-center py-16 text-dark-500">
          <div class="text-4xl mb-4 animate-bounce-slow">🛰️</div>
          <p class="text-sm font-medium">Waiting for data...</p>
          <p class="text-xs text-dark-600 mt-2 max-w-[200px] mx-auto">
            Live events will appear here as soon as users interact with your
            sites.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
