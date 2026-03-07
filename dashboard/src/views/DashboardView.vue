<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { useWebsiteStore, useDateStore } from "../stores/index";
import { api } from "../lib/api";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend,
);

const websiteStore = useWebsiteStore();
const dateStore = useDateStore();

const overview = ref<any>(null);
const previous = ref<any>(null);
const timeseries = ref<any[]>([]);
const topPages = ref<any[]>([]);
const topSources = ref<any[]>([]);
const loading = ref(true);
const fetchError = ref("");

async function fetchData() {
  if (!websiteStore.currentId) return;
  loading.value = true;
  fetchError.value = "";

  try {
    const [overviewRes, timeseriesRes, pagesRes, sourcesRes] =
      await Promise.all([
        api.get("/stats/overview", {
          params: {
            websiteId: websiteStore.currentId,
            start: dateStore.start,
            end: dateStore.end,
          },
        }),
        api.get("/stats/timeseries", {
          params: {
            websiteId: websiteStore.currentId,
            start: dateStore.start,
            end: dateStore.end,
          },
        }),
        api.get("/stats/pages", {
          params: {
            websiteId: websiteStore.currentId,
            start: dateStore.start,
            end: dateStore.end,
            limit: 5,
          },
        }),
        api.get("/stats/sources", {
          params: {
            websiteId: websiteStore.currentId,
            start: dateStore.start,
            end: dateStore.end,
          },
        }),
      ]);

    overview.value = overviewRes.data.overview;
    previous.value = overviewRes.data.previous;
    timeseries.value = timeseriesRes.data.timeseries;
    topPages.value = pagesRes.data.pages;
    topSources.value = sourcesRes.data.sources;
  } catch (err: any) {
    console.error("Failed to fetch stats:", err);
    fetchError.value = err?.message || "Failed to load data";
  } finally {
    loading.value = false;
  }
}

watch(
  [() => websiteStore.currentId, () => dateStore.start, () => dateStore.end],
  fetchData,
);
onMounted(fetchData);

function calcChange(current: number, prev: number): string {
  if (prev === 0 || prev === null || prev === undefined) {
    if (current > 0) return "New";
    return "—";
  }
  const change = ((current - prev) / prev) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
}

function isChangePositive(change: string, invert = false): boolean {
  if (change === "New") return !invert;
  if (change === "—") return true;
  const positive = change.startsWith("+") && change !== "+0.0%";
  return invert ? !positive : positive;
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatNumber(n: number): string {
  if (!n && n !== 0) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

const chartData = computed(() => {
  if (!timeseries.value?.length) return { labels: [], datasets: [] };
  return {
    labels: timeseries.value.map((d: any) => {
      const date = new Date(d.date);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }),
    datasets: [
      {
        label: "Page Views",
        data: timeseries.value.map((d: any) => parseInt(d.views)),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.08)",
        fill: true,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "#3b82f6",
        pointHoverBorderColor: "#fff",
        pointHoverBorderWidth: 2,
      },
      {
        label: "Sessions",
        data: timeseries.value.map((d: any) => parseInt(d.sessions)),
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139,92,246,0.04)",
        fill: true,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "#8b5cf6",
        pointHoverBorderColor: "#fff",
        pointHoverBorderWidth: 2,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: "top" as const,
      align: "end" as const,
      labels: {
        color: "#64748b",
        font: { size: 11 },
        boxWidth: 8,
        boxHeight: 8,
        borderRadius: 4,
        useBorderRadius: true,
        padding: 16,
      },
    },
    tooltip: {
      mode: "index" as const,
      intersect: false,
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: "rgba(51, 65, 85, 0.5)",
      borderWidth: 1,
      cornerRadius: 12,
      padding: 12,
      titleFont: { size: 12, weight: 600 },
      bodyFont: { size: 11 },
      titleColor: "#e2e8f0",
      bodyColor: "#94a3b8",
    },
  },
  scales: {
    x: {
      grid: { color: "rgba(255,255,255,0.03)", drawBorder: false },
      ticks: { color: "#64748b", font: { size: 10 }, maxRotation: 0 },
      border: { display: false },
    },
    y: {
      grid: { color: "rgba(255,255,255,0.03)", drawBorder: false },
      ticks: { color: "#64748b", font: { size: 10 }, padding: 8 },
      border: { display: false },
      beginAtZero: true,
    },
  },
  elements: { line: { tension: 0.4 } },
  interaction: { mode: "nearest" as const, axis: "x" as const },
};

const kpiCards = computed(() => {
  const o = overview.value;
  const p = previous.value || {};
  if (!o) return [];
  return [
    {
      label: "Unique Visitors",
      value: formatNumber(o.uniqueVisitors),
      change: calcChange(o.uniqueVisitors, p.uniqueVisitors),
      icon: "👥",
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconBg: "bg-blue-500/15",
    },
    {
      label: "Page Views",
      value: formatNumber(o.totalViews),
      change: calcChange(o.totalViews, p.totalViews),
      icon: "📊",
      gradient: "from-violet-500/20 to-purple-500/20",
      iconBg: "bg-violet-500/15",
    },
    {
      label: "Avg Duration",
      value: formatDuration(o.avgDuration),
      change: calcChange(o.avgDuration, p.avgDuration),
      icon: "⏱️",
      gradient: "from-emerald-500/20 to-green-500/20",
      iconBg: "bg-emerald-500/15",
    },
    {
      label: "Bounce Rate",
      value: `${o.bounceRate || 0}%`,
      change: calcChange(o.bounceRate || 0, p.bounceRate || 0),
      icon: "↗️",
      gradient: "from-amber-500/20 to-orange-500/20",
      iconBg: "bg-amber-500/15",
      invertChange: true,
    },
    {
      label: "Active Now",
      value: o.activeVisitors.toString(),
      icon: "⚡",
      gradient: "from-pink-500/20 to-rose-500/20",
      iconBg: "bg-pink-500/15",
      live: true,
    },
  ];
});

// Compute page view  bar width proportional to max
function pageBarWidth(views: string): string {
  if (!topPages.value.length) return "0%";
  const max = Math.max(...topPages.value.map((p: any) => parseInt(p.views)));
  return `${(parseInt(views) / max) * 100}%`;
}
</script>

<template>
  <div class="space-y-6">
    <!-- Empty state -->
    <div v-if="!loading && !websiteStore.currentId" class="text-center py-20">
      <div
        class="w-20 h-20 mx-auto rounded-2xl bg-primary-600/15 flex items-center justify-center text-4xl mb-6"
      >
        📊
      </div>
      <h2 class="text-xl font-semibold text-dark-200 mb-2">
        No website configured
      </h2>
      <p class="text-dark-400 mb-6 text-sm">
        Add a website in Settings to start tracking analytics
      </p>
      <router-link
        to="/settings"
        class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-medium hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg shadow-primary-600/20"
      >
        ⚙️ Go to Settings
      </router-link>
    </div>

    <!-- Loading skeleton -->
    <template v-else-if="loading">
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div v-for="i in 5" :key="i" class="glass-card p-5">
          <div class="skeleton h-3 w-20 mb-3"></div>
          <div class="skeleton h-7 w-16 mb-2"></div>
          <div class="skeleton h-3 w-24"></div>
        </div>
      </div>
      <div class="glass-card p-6">
        <div class="skeleton h-4 w-32 mb-4"></div>
        <div class="skeleton h-64 w-full rounded-xl"></div>
      </div>
    </template>

    <!-- Error state -->
    <div v-else-if="fetchError" class="glass-card p-8 text-center">
      <div class="text-4xl mb-4">⚠️</div>
      <p class="text-dark-400">{{ fetchError }}</p>
      <button
        @click="fetchData"
        class="mt-4 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm hover:bg-primary-500 transition-colors"
      >
        Retry
      </button>
    </div>

    <template v-else>
      <!-- KPI Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div
          v-for="(card, idx) in kpiCards"
          :key="card.label"
          class="relative overflow-hidden glass-card p-5 card-hover group"
          :style="{ animationDelay: `${idx * 50}ms` }"
        >
          <!-- Background gradient glow -->
          <div
            class="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            :class="`bg-gradient-to-br ${card.gradient}`"
          ></div>

          <div class="relative">
            <div class="flex items-center justify-between mb-3">
              <span
                class="text-[11px] font-medium text-dark-500 uppercase tracking-wider"
                >{{ card.label }}</span
              >
              <span
                class="text-lg w-8 h-8 rounded-lg flex items-center justify-center"
                :class="card.iconBg"
                >{{ card.icon }}</span
              >
            </div>
            <div class="text-2xl font-bold text-dark-100 mb-1 stat-number">
              {{ card.value }}
              <span
                v-if="card.live"
                class="inline-block w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse ml-1 -translate-y-0.5"
              ></span>
            </div>
            <div
              v-if="card.change"
              class="flex items-center gap-1 text-xs font-medium"
            >
              <svg
                v-if="isChangePositive(card.change, card.invertChange)"
                class="w-3 h-3 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
              <svg
                v-else
                class="w-3 h-3 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
              <span
                :class="
                  isChangePositive(card.change, card.invertChange)
                    ? 'text-emerald-400'
                    : 'text-red-400'
                "
              >
                {{ card.change }}
              </span>
              <span class="text-dark-600">vs prev</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Traffic Chart -->
      <div class="glass-card p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-sm font-semibold text-dark-200">Traffic Overview</h3>
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1.5 text-xs text-dark-500">
              <span class="w-2 h-2 rounded-full bg-blue-500"></span>Views
            </div>
            <div class="flex items-center gap-1.5 text-xs text-dark-500">
              <span class="w-2 h-2 rounded-full bg-violet-500"></span>Sessions
            </div>
          </div>
        </div>
        <div class="h-72">
          <Line
            v-if="chartData.labels?.length"
            :data="chartData"
            :options="chartOptions"
          />
          <div
            v-else
            class="flex flex-col items-center justify-center h-full text-dark-500"
          >
            <div class="text-3xl mb-3">📈</div>
            <p class="text-sm">No data for this period</p>
          </div>
        </div>
      </div>

      <!-- Bottom grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Top Pages -->
        <div class="glass-card p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-sm font-semibold text-dark-200">Top Pages</h3>
            <router-link
              to="/pages"
              class="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
            >
              View all
              <svg
                class="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </router-link>
          </div>
          <div class="space-y-3">
            <div v-for="page in topPages" :key="page.path" class="relative">
              <!-- Background bar -->
              <div
                class="absolute inset-0 rounded-lg bg-primary-500/6 transition-all"
                :style="{ width: pageBarWidth(page.views) }"
              ></div>
              <div
                class="relative flex items-center justify-between py-2.5 px-3"
              >
                <span
                  class="text-sm text-dark-300 truncate max-w-[200px] font-mono"
                  >{{ page.path }}</span
                >
                <div
                  class="flex items-center gap-4 text-xs text-dark-400 shrink-0"
                >
                  <span class="font-medium text-dark-300"
                    >{{ parseInt(page.views).toLocaleString() }}
                    <span class="text-dark-500 font-normal">views</span></span
                  >
                  <span
                    >{{ parseInt(page.visitors).toLocaleString() }}
                    <span class="text-dark-500">visitors</span></span
                  >
                </div>
              </div>
            </div>
            <div
              v-if="!topPages.length && !loading"
              class="text-center py-10 flex flex-col items-center justify-center animate-fade-in"
            >
              <div
                class="w-12 h-12 bg-dark-800/50 rounded-full flex items-center justify-center mb-3 text-dark-500"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p
                class="text-[11px] uppercase tracking-widest font-bold text-dark-500"
              >
                No page data yet
              </p>
            </div>
          </div>
        </div>

        <!-- Top Sources -->
        <div class="glass-card p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-sm font-semibold text-dark-200">Top Sources</h3>
            <router-link
              to="/sources"
              class="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
            >
              View all
              <svg
                class="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </router-link>
          </div>
          <div class="space-y-3">
            <div
              v-for="source in topSources"
              :key="source.source"
              class="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-dark-800/40 transition-colors"
            >
              <div class="flex items-center gap-2">
                <span
                  class="w-2 h-2 rounded-full"
                  :class="
                    source.source === '(direct)'
                      ? 'bg-emerald-400'
                      : 'bg-blue-400'
                  "
                ></span>
                <span class="text-sm text-dark-300">{{ source.source }}</span>
              </div>
              <div class="flex items-center gap-4 text-xs text-dark-400">
                <span class="font-medium text-dark-300"
                  >{{ parseInt(source.sessions).toLocaleString() }}
                  <span class="text-dark-500 font-normal">sessions</span></span
                >
                <span
                  class="px-2 py-0.5 rounded-full text-[10px]"
                  :class="
                    parseFloat(source.bounce_rate) > 70
                      ? 'badge-danger'
                      : parseFloat(source.bounce_rate) > 40
                        ? 'badge-warning'
                        : 'badge-success'
                  "
                >
                  {{ source.bounce_rate }}% bounce
                </span>
              </div>
            </div>
            <div
              v-if="!topSources.length && !loading"
              class="text-center py-10 flex flex-col items-center justify-center animate-fade-in"
            >
              <div
                class="w-12 h-12 bg-dark-800/50 rounded-full flex items-center justify-center mb-3 text-dark-500"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              </div>
              <p
                class="text-[11px] uppercase tracking-widest font-bold text-dark-500"
              >
                No source data yet
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
