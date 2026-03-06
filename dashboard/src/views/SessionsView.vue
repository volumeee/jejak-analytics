<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from "vue";
import { useWebsiteStore } from "../stores/index";
import { api } from "../lib/api";

const ws = useWebsiteStore();
const sessions = ref<any[]>([]);
const total = ref(0);
const page = ref(0);
const loading = ref(true);

// Player state
const playerVisible = ref(false);
const playerLoading = ref(false);
const playerEvents = ref<any[]>([]);
const playerContainer = ref<HTMLElement | null>(null);
const currentPlayerSessionId = ref("");

async function fetchData() {
  if (!ws.currentId) return;
  loading.value = true;
  try {
    const res = await api.get("/sessions", {
      params: { websiteId: ws.currentId, limit: 15, offset: page.value * 15 },
    });
    sessions.value = res.data.sessions;
    total.value = res.data.total;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function playSession(sessionId: string) {
  currentPlayerSessionId.value = sessionId;
  playerVisible.value = true;
  playerLoading.value = true;
  playerEvents.value = [];

  try {
    const res = await api.get(`/sessions/${sessionId}/recording`);
    playerEvents.value = res.data.events;

    // Dynamically load player
    await nextTick();
    if (playerEvents.value.length > 0 && playerContainer.value) {
      // @ts-ignore
      const rrwebPlayer = (await import("rrweb-player")).default;
      // Clear container
      playerContainer.value.innerHTML = "";

      new rrwebPlayer({
        target: playerContainer.value,
        props: {
          events: playerEvents.value,
          width: 1024,
          height: 576,
          autoPlay: true,
        },
      });
    }
  } catch (e) {
    console.error("Failed to load recording:", e);
  } finally {
    playerLoading.value = false;
  }
}

function closePlayer() {
  playerVisible.value = false;
  playerEvents.value = [];
  if (playerContainer.value) playerContainer.value.innerHTML = "";
}

watch([() => ws.currentId, page], fetchData);
onMounted(fetchData);

function formatDate(d: string) {
  const date = new Date(d);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(s: number) {
  if (!s) return "0s";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}
</script>

<template>
  <div class="space-y-6 animate-fade-in relative">
    <!-- Main Card -->
    <div class="glass-card p-6">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h3 class="text-xl font-black text-dark-100 uppercase tracking-tight">
            Active Sessions
          </h3>
          <p class="text-xs text-dark-500 mt-1">
            User journeys across your website
          </p>
        </div>
        <div
          class="px-4 py-2 bg-dark-800 rounded-xl text-xs font-bold text-primary-400 border border-primary-500/20 shadow-lg shadow-primary-500/5"
        >
          {{ total.toLocaleString() }} TOTAL
        </div>
      </div>

      <!-- Session List -->
      <div
        v-if="loading && !sessions.length"
        class="flex flex-col items-center justify-center py-20 gap-4"
      >
        <div
          class="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"
        ></div>
        <p class="text-xs font-bold text-dark-600 uppercase tracking-widest">
          Gathering sessions...
        </p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="s in sessions"
          :key="s.id"
          class="group bg-dark-800/20 hover:bg-dark-800/50 border border-dark-700/30 hover:border-primary-500/30 rounded-2xl p-4 transition-all duration-300"
        >
          <div
            class="flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div class="flex-1 space-y-3">
              <!-- Header info -->
              <div class="flex items-center flex-wrap gap-2">
                <span
                  class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-dark-700 text-dark-300 font-mono tracking-tighter"
                >
                  ID: {{ s.id.substring(0, 8) }}
                </span>
                <span
                  :class="[
                    'text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-widest',
                    s.is_bounce
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-emerald-500/10 text-emerald-400',
                  ]"
                >
                  {{ s.is_bounce ? "Bounce" : `${s.page_count} Pages` }}
                </span>
                <span
                  v-if="s.has_recording"
                  class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-primary-500/10 text-primary-400 uppercase tracking-widest flex items-center gap-1"
                >
                  <span class="animate-pulse">●</span> REC
                </span>
                <span
                  class="text-[10px] font-medium text-dark-500 ml-auto md:ml-2"
                >
                  {{ formatDate(s.started_at) }}
                </span>
              </div>

              <!-- Metrics & User Info -->
              <div class="flex flex-wrap items-center gap-y-2 gap-x-6">
                <div class="flex items-center gap-2">
                  <span class="text-[14px]">⏱</span>
                  <span class="text-xs font-bold text-dark-200">{{
                    formatDuration(s.duration)
                  }}</span>
                </div>
                <div v-if="s.country" class="flex items-center gap-2">
                  <span class="text-[14px]">🌍</span>
                  <span class="text-xs font-medium text-dark-300"
                    >{{ s.country }} ({{ s.city || "Private" }})</span
                  >
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[14px]">🌐</span>
                  <span class="text-xs font-medium text-dark-400"
                    >{{ s.browser }} · {{ s.os }}</span
                  >
                </div>
                <div v-if="s.referrer_domain" class="flex items-center gap-2">
                  <span class="text-[14px]">🔗</span>
                  <span class="text-xs font-medium text-primary-400/70">{{
                    s.referrer_domain
                  }}</span>
                </div>
              </div>

              <div
                class="text-[11px] text-dark-500 font-mono truncate bg-dark-900/40 p-2 rounded-lg border border-dark-800/50"
              >
                <span class="text-primary-500 mr-2">ENTRY:</span
                >{{ s.entry_url }}
              </div>
            </div>

            <!-- Action -->
            <div class="shrink-0 flex items-center justify-end gap-3">
              <button
                v-if="s.has_recording"
                @click="playSession(s.id)"
                class="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary-600/20 active:scale-95 group"
              >
                <span
                  class="text-base group-hover:scale-125 transition-transform duration-300"
                  >▶</span
                >
                PLAY REPLAY
              </button>
              <button
                v-else
                class="text-[10px] font-bold text-dark-600 uppercase tracking-widest px-4 py-2 bg-dark-800/50 rounded-lg cursor-not-allowed"
              >
                No Track
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="!sessions.length && !loading"
          class="text-center py-20 grayscale hover:grayscale-0 transition-all duration-500 opacity-40 hover:opacity-100"
        >
          <div class="text-6xl mb-4">📼</div>
          <p class="text-dark-400 font-bold uppercase tracking-widest text-sm">
            No recorded sessions yet
          </p>
          <p class="text-dark-600 text-xs mt-2 italic">
            Enable "data-recording" to capture user journeys
          </p>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="total > 15"
        class="flex items-center justify-between mt-10 pt-6 border-t border-dark-800/50"
      >
        <p
          class="text-[10px] font-bold text-dark-600 uppercase tracking-widest"
        >
          Showing {{ page * 15 + 1 }} -
          {{ Math.min((page + 1) * 15, total) }} of {{ total }}
        </p>
        <div class="flex gap-2">
          <button
            @click="page = Math.max(0, page - 1)"
            :disabled="page === 0"
            class="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-dark-800 text-dark-400 hover:bg-dark-700 disabled:opacity-30 transition-all border border-dark-700"
          >
            ← Prev
          </button>
          <button
            @click="page++"
            :disabled="(page + 1) * 15 >= total"
            class="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-dark-800 text-dark-400 hover:bg-dark-700 disabled:opacity-30 transition-all border border-dark-700"
          >
            Next →
          </button>
        </div>
      </div>
    </div>

    <!-- Replay Modal Overlay -->
    <Transition name="fade">
      <div
        v-if="playerVisible"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-dark-950/90 backdrop-blur-md p-4 md:p-12"
      >
        <div
          class="relative w-full max-w-6xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl shadow-primary-500/10 border border-dark-800 animate-slide-up"
        >
          <!-- Close & Header -->
          <div
            class="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between px-6"
          >
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
              <div
                class="text-xs font-black text-white uppercase tracking-widest"
              >
                Now Playing: Session
                {{ currentPlayerSessionId.substring(0, 8) }}
              </div>
            </div>
            <button
              @click="closePlayer"
              class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
            >
              ✕
            </button>
          </div>

          <!-- The Player -->
          <div
            class="w-full h-full flex items-center justify-center overflow-hidden"
          >
            <div ref="playerContainer" class="w-full h-full"></div>

            <div
              v-if="playerLoading"
              class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/50 z-20"
            >
              <div
                class="w-16 h-16 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"
              ></div>
              <p
                class="text-sm font-bold text-primary-400 uppercase tracking-[0.2em] animate-pulse"
              >
                Buffering Session Data...
              </p>
            </div>

            <div
              v-if="!playerLoading && playerEvents.length === 0"
              class="flex flex-col items-center justify-center gap-4 text-dark-500"
            >
              <div class="text-4xl">⚠️</div>
              <p class="text-sm font-bold uppercase tracking-widest">
                Failed to load recording events
              </p>
              <button
                @click="closePlayer"
                class="px-6 py-2 bg-dark-800 rounded-xl text-xs font-bold uppercase tracking-widest"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@import "rrweb-player/dist/style.css";

.glass-card {
  background: rgba(17, 24, 39, 0.4);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(31, 41, 55, 0.5);
  border-radius: 2rem;
}
</style>
