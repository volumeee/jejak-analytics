<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useWebsiteStore, useDateStore } from "../stores/index";
import { api } from "../lib/api";

const ws = useWebsiteStore();
const ds = useDateStore();

const pages = ref<any[]>([]);
const selectedPage = ref("");
const deviceType = ref<"desktop" | "mobile" | "all">("all");
const points = ref<any[]>([]);
const loading = ref(true);
const showOverlay = ref(true);

async function fetchPages() {
  if (!ws.currentId) return;
  try {
    const res = await api.get("/heatmaps/pages", {
      params: { websiteId: ws.currentId, start: ds.start, end: ds.end },
    });
    pages.value = res.data.pages;
    if (pages.value.length > 0 && !selectedPage.value)
      selectedPage.value = pages.value[0].path;
  } catch (e) {
    console.error(e);
  }
}

async function fetchHeatmap() {
  if (!ws.currentId || !selectedPage.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const res = await api.get("/heatmaps", {
      params: {
        websiteId: ws.currentId,
        path: selectedPage.value,
        start: ds.start,
        end: ds.end,
        deviceType: deviceType.value === "all" ? undefined : deviceType.value,
      },
    });
    points.value = res.data.points;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

const iframeUrl = ref("");
const iframeInputUrl = ref("");
watch(selectedPage, (newPath) => {
  if (!newPath) return;
  if (ws.current?.domain) {
    const domain = ws.current.domain.startsWith("http")
      ? ws.current.domain
      : `http://${ws.current.domain}`;
    // Handle hash-based SPA routing: /download → /#download
    // Only add # if it's not the root path
    const hashPath = newPath === "/" ? "" : `#${newPath}`;
    iframeUrl.value = `${domain}/${hashPath}`;
    iframeInputUrl.value = iframeUrl.value;
  }
});

function applyCustomUrl() {
  iframeUrl.value = iframeInputUrl.value;
}

watch([() => ws.currentId, () => ds.start, () => ds.end], fetchPages);
watch([selectedPage, deviceType, () => ds.start, () => ds.end], fetchHeatmap);

onMounted(() => {
  fetchPages().then(fetchHeatmap);
});
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Toolbar -->
    <div
      class="glass-card p-4 flex flex-wrap items-center justify-between gap-4"
    >
      <div class="flex items-center gap-3">
        <div class="text-xs font-bold text-dark-500 uppercase tracking-widest">
          Page
        </div>
        <select
          v-model="selectedPage"
          class="bg-dark-800 text-dark-100 text-sm rounded-xl px-4 py-2 border border-dark-700 focus:border-primary-500 focus:outline-none min-w-[240px] appearance-none cursor-pointer"
        >
          <option v-for="p in pages" :key="p.path" :value="p.path">
            {{ p.path }}
            <template v-if="parseInt(p.clicks) > 0"
              >({{ parseInt(p.clicks) }} clicks)</template
            >
            <template v-else>({{ parseInt(p.views) }} views)</template>
          </option>
        </select>
      </div>

      <div
        class="flex items-center gap-2 bg-dark-800/50 p-1 rounded-xl border border-dark-700/50"
      >
        <button
          v-for="d in ['all', 'desktop', 'mobile']"
          :key="d"
          @click="deviceType = d as any"
          :class="[
            'px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all',
            deviceType === d
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
              : 'text-dark-500 hover:text-dark-300',
          ]"
        >
          {{ d }}
        </button>
      </div>

      <!-- URL Preview Input -->
      <div class="flex items-center gap-2 flex-1 max-w-sm">
        <span class="text-xs text-dark-500 whitespace-nowrap"
          >Preview URL:</span
        >
        <input
          v-model="iframeInputUrl"
          @keydown.enter="applyCustomUrl"
          type="text"
          placeholder="http://localhost:5173/#download"
          class="flex-1 bg-dark-800 text-dark-200 text-xs rounded-lg px-3 py-1.5 border border-dark-700 focus:border-primary-500 focus:outline-none"
        />
        <button
          @click="applyCustomUrl"
          class="px-3 py-1.5 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap"
        >
          Load
        </button>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="showOverlay = !showOverlay"
          class="px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-dark-700 transition-all"
          :class="
            showOverlay
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-dark-800 text-dark-500'
          "
        >
          Overlay: {{ showOverlay ? "ON" : "OFF" }}
        </button>
      </div>
    </div>

    <!-- Heatmap Viewer -->
    <div
      class="glass-card overflow-hidden relative"
      style="height: calc(100vh - 280px)"
    >
      <!-- Loading State -->
      <div
        v-if="loading"
        class="absolute inset-0 z-50 bg-dark-900/40 backdrop-blur-sm flex items-center justify-center"
      >
        <div
          class="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"
        ></div>
      </div>

      <div class="relative w-full h-full bg-white flex justify-center">
        <!-- The Website Iframe -->
        <iframe
          v-if="iframeUrl"
          :src="iframeUrl"
          class="w-full h-full border-none pointer-events-none"
          :style="{
            width: deviceType === 'mobile' ? '375px' : '100%',
            maxWidth: '100%',
          }"
        ></iframe>

        <!-- Heatmap Overlay -->
        <div
          v-if="showOverlay"
          class="absolute inset-0 overflow-hidden pointer-events-none"
          :style="{
            width: deviceType === 'mobile' ? '375px' : '100%',
            left: deviceType === 'mobile' ? '50%' : '0',
            transform: deviceType === 'mobile' ? 'translateX(-50%)' : 'none',
          }"
        >
          <div
            v-for="(point, i) in points"
            :key="i"
            class="absolute rounded-full"
            :style="{
              left: `${point.x * 100}%`,
              top: `${point.y * 100}%`,
              width: `${Math.min(10 + point.value * 2, 40)}px`,
              height: `${Math.min(10 + point.value * 2, 40)}px`,
              background: `radial-gradient(circle, rgba(239,68,68,${Math.min(0.2 + point.value * 0.05, 0.7)}) 0%, transparent 80%)`,
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 10px rgba(239,68,68,0.2)',
              filter: 'blur(1px)',
            }"
          ></div>
        </div>

        <div
          v-if="!points.length && !loading"
          class="absolute inset-0 flex items-center justify-center bg-dark-900/80 backdrop-blur-sm"
        >
          <div class="text-center group">
            <div
              class="text-4xl mb-2 grayscale group-hover:grayscale-0 transition-all duration-500"
            >
              🔥
            </div>
            <p class="text-dark-400 text-sm font-medium">
              No heatmap data found for this period
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  background: rgba(17, 24, 39, 0.4);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(31, 41, 55, 0.5);
  border-radius: 1.5rem;
}
</style>
