<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useWebsiteStore, useDateStore } from "../stores/index";
import { api } from "../lib/api";
import { Doughnut } from "vue-chartjs";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
ChartJS.register(ArcElement, Tooltip, Legend);

const ws = useWebsiteStore();
const ds = useDateStore();
const breakdownType = ref("country");
const data = ref<any[]>([]);
const loading = ref(true);

const types = [
  { value: "country", label: "🌍 Countries" },
  { value: "browser", label: "🌐 Browsers" },
  { value: "os", label: "💻 OS" },
  { value: "device", label: "📱 Devices" },
  { value: "language", label: "🔤 Languages" },
];

const colors = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#f97316",
];

async function fetchData() {
  if (!ws.currentId) return;
  loading.value = true;
  try {
    const res = await api.get("/stats/visitors", {
      params: {
        websiteId: ws.currentId,
        start: ds.start,
        end: ds.end,
        by: breakdownType.value,
      },
    });
    data.value = res.data.visitors;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

watch(
  [() => ws.currentId, () => ds.start, () => ds.end, breakdownType],
  fetchData,
);
onMounted(fetchData);

function getChartData() {
  return {
    labels: data.value.slice(0, 8).map((d) => d.value || "Unknown"),
    datasets: [
      {
        data: data.value.slice(0, 8).map((d) => parseInt(d.sessions)),
        backgroundColor: colors,
        borderWidth: 0,
      },
    ],
  };
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex gap-2 flex-wrap">
      <button
        v-for="t in types"
        :key="t.value"
        @click="breakdownType = t.value"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-medium transition-all',
          breakdownType === t.value
            ? 'bg-primary-600 text-white'
            : 'bg-dark-800/60 text-dark-400 hover:text-dark-200',
        ]"
      >
        {{ t.label }}
      </button>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Chart -->
      <div
        class="bg-dark-900/60 backdrop-blur-sm border border-dark-800/50 rounded-2xl p-6 flex items-center justify-center"
      >
        <div class="w-64 h-64 relative flex items-center justify-center">
          <div
            v-if="loading"
            class="absolute inset-0 rounded-full border-[30px] border-dark-800/30 animate-pulse"
          ></div>
          <Doughnut
            v-else-if="data.length"
            :data="getChartData()"
            :options="{
              plugins: {
                legend: {
                  position: 'bottom' as const,
                  labels: { color: '#94a3b8', font: { size: 11 } },
                },
              },
              cutout: '65%',
              animation: { duration: 500 },
            }"
          />
          <div
            v-else
            class="flex flex-col items-center justify-center h-full text-dark-500 text-sm animate-fade-in"
          >
            <svg
              class="w-8 h-8 mb-2 opacity-30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
              />
            </svg>
            No data
          </div>
        </div>
      </div>
      <!-- Table -->
      <div
        class="bg-dark-900/60 backdrop-blur-sm border border-dark-800/50 rounded-2xl p-6"
      >
        <table class="w-full text-sm">
          <thead>
            <tr
              class="text-xs text-dark-400 uppercase border-b border-dark-800/50"
            >
              <th class="text-left py-3">Value</th>
              <th class="text-right py-3">Sessions</th>
              <th class="text-right py-3">Visitors</th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr
              v-for="i in 5"
              :key="`skeleton-${i}`"
              class="animate-pulse border-b border-dark-800/30"
            >
              <td class="py-3.5">
                <div class="h-4 bg-dark-800/40 rounded w-1/2"></div>
              </td>
              <td class="py-3.5">
                <div class="h-4 bg-dark-800/40 rounded w-1/3 ml-auto"></div>
              </td>
              <td class="py-3.5">
                <div class="h-4 bg-dark-800/40 rounded w-1/3 ml-auto"></div>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr
              v-for="(item, i) in data"
              :key="item.value"
              class="border-b border-dark-800/30 hover:bg-dark-800/10 transition-colors"
            >
              <td class="py-2.5 text-dark-200 flex items-center gap-2">
                <span
                  class="w-2.5 h-2.5 rounded-full"
                  :style="{ backgroundColor: colors[i % colors.length] }"
                ></span>
                {{ item.value || "Unknown" }}
              </td>
              <td class="py-2.5 text-right text-dark-300">
                {{ parseInt(item.sessions).toLocaleString() }}
              </td>
              <td class="py-2.5 text-right text-dark-400">
                {{ parseInt(item.visitors).toLocaleString() }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
