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
        <div class="w-64 h-64">
          <Doughnut
            v-if="data.length"
            :data="getChartData()"
            :options="{
              plugins: {
                legend: {
                  position: 'bottom' as const,
                  labels: { color: '#94a3b8', font: { size: 11 } },
                },
              },
              cutout: '65%',
            }"
          />
          <div
            v-else
            class="flex items-center justify-center h-full text-dark-500 text-sm"
          >
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
          <tbody>
            <tr
              v-for="(item, i) in data"
              :key="item.value"
              class="border-b border-dark-800/30"
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
