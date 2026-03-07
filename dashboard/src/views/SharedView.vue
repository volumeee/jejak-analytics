<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
);

const route = useRoute();
const token = route.params.token as string;

const loading = ref(true);
const error = ref("");
const website = ref<any>(null);
const stats = ref<any>(null);

onMounted(async () => {
  try {
    // Fetch shared link info
    const infoRes = await fetch(`/api/share/${token}`);
    if (!infoRes.ok) {
      error.value = "This shared link is invalid or expired";
      loading.value = false;
      return;
    }
    const info = await infoRes.json();
    website.value = info.website;

    // Fetch stats
    const statsRes = await fetch(`/api/share/${token}/stats`);
    if (statsRes.ok) stats.value = await statsRes.json();
  } catch (e) {
    error.value = "Failed to load shared dashboard";
  } finally {
    loading.value = false;
  }
});

const chartData = () => {
  if (!stats.value?.timeseries) return { labels: [], datasets: [] };
  return {
    labels: stats.value.timeseries.map((d: any) => d.date),
    datasets: [
      {
        label: "Page Views",
        data: stats.value.timeseries.map((d: any) => Number(d.views)),
        borderColor: "#60a5fa",
        backgroundColor: "rgba(96, 165, 250, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      },
    ],
  };
};

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      grid: { color: "rgba(255,255,255,0.06)" },
      ticks: { color: "#94a3b8" },
    },
    y: {
      grid: { color: "rgba(255,255,255,0.06)" },
      ticks: { color: "#94a3b8" },
      beginAtZero: true,
    },
  },
};
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-white p-8">
    <!-- Loading State -->
    <div
      v-if="loading"
      class="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in"
    >
      <div
        class="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"
      ></div>
      <div class="text-gray-400 font-medium tracking-wide uppercase text-sm">
        Loading Dashboard
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in"
    >
      <div
        class="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mb-6 text-gray-500 text-4xl"
      >
        🔗
      </div>
      <p class="text-gray-300 font-medium tracking-wide text-lg">{{ error }}</p>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="mb-8 text-center">
        <div class="flex items-center justify-center gap-3 mb-2">
          <div
            class="w-10 h-10 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-lg flex items-center justify-center"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              class="w-6 h-6"
              stroke="white"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M12 19c-1.5 0-3-1.5-3-4s1.5-5 3-7c1.5 2 3 3.5 3 7s-1.5 4-3 4z"
              />
              <circle cx="9" cy="6" r="1" fill="white" stroke="none" />
              <circle cx="12" cy="4" r="1" fill="white" stroke="none" />
              <circle cx="15" cy="6" r="1" fill="white" stroke="none" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold">{{ website?.name }}</h1>
        </div>
        <p class="text-gray-400">{{ website?.domain }} — Public Dashboard</p>
        <p class="text-sm text-gray-500 mt-1">
          {{ stats?.period?.start }} → {{ stats?.period?.end }}
        </p>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto">
        <div class="bg-gray-800/60 rounded-xl p-5 border border-gray-700/40">
          <p class="text-sm text-gray-400 mb-1">Unique Visitors</p>
          <p class="text-2xl font-bold">
            {{ stats?.overview?.unique_visitors || 0 }}
          </p>
        </div>
        <div class="bg-gray-800/60 rounded-xl p-5 border border-gray-700/40">
          <p class="text-sm text-gray-400 mb-1">Page Views</p>
          <p class="text-2xl font-bold">
            {{ stats?.overview?.total_views || 0 }}
          </p>
        </div>
        <div class="bg-gray-800/60 rounded-xl p-5 border border-gray-700/40">
          <p class="text-sm text-gray-400 mb-1">Sessions</p>
          <p class="text-2xl font-bold">
            {{ stats?.overview?.total_sessions || 0 }}
          </p>
        </div>
        <div class="bg-gray-800/60 rounded-xl p-5 border border-gray-700/40">
          <p class="text-sm text-gray-400 mb-1">Bounce Rate</p>
          <p class="text-2xl font-bold">
            {{ stats?.overview?.bounce_rate || 0 }}%
          </p>
        </div>
      </div>

      <!-- Chart -->
      <div
        class="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40 mb-8 max-w-4xl mx-auto"
      >
        <h2 class="text-lg font-semibold mb-4">Traffic Overview</h2>
        <div style="height: 280px">
          <Line :data="chartData()" :options="chartOpts as any" />
        </div>
      </div>

      <!-- Top Pages -->
      <div
        v-if="stats?.topPages?.length"
        class="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40 max-w-4xl mx-auto"
      >
        <h2 class="text-lg font-semibold mb-4">Top Pages</h2>
        <div
          v-for="p in stats.topPages"
          :key="p.path"
          class="flex justify-between py-2 border-b border-gray-700/30 last:border-0"
        >
          <span class="text-gray-300">{{ p.path }}</span>
          <span class="text-gray-400"
            >{{ p.views }} views · {{ p.visitors }} visitors</span
          >
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center mt-10 text-sm text-gray-600">
        Powered by Jejak — Self-hosted web analytics
      </div>
    </template>
  </div>
</template>
