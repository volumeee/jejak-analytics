<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useWebsiteStore, useDateStore } from "../stores/index";
import { api } from "../lib/api";

const ws = useWebsiteStore();
const ds = useDateStore();
const perf = ref<any>(null);
const pages = ref<any[]>([]);
const loading = ref(true);

async function fetchData() {
  if (!ws.currentId) return;
  loading.value = true;
  try {
    const [perfRes, pagesRes] = await Promise.all([
      api.get("/performance", {
        params: { websiteId: ws.currentId, start: ds.start, end: ds.end },
      }),
      api.get("/performance/pages", {
        params: { websiteId: ws.currentId, start: ds.start, end: ds.end },
      }),
    ]);
    perf.value = perfRes.data.performance;
    pages.value = pagesRes.data.pages;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

watch([() => ws.currentId, () => ds.start, () => ds.end], fetchData);
onMounted(fetchData);

function getVitalStatus(
  metric: string,
  value: number,
): { label: string; class: string } {
  const thresholds: Record<string, [number, number]> = {
    lcp: [2500, 4000],
    fcp: [1800, 3000],
    cls: [0.1, 0.25],
    ttfb: [800, 1800],
  };
  const t = thresholds[metric] || [1000, 3000];
  if (value <= t[0])
    return { label: "Good", class: "text-emerald-400 bg-emerald-500/20" };
  if (value <= t[1])
    return { label: "Needs Work", class: "text-amber-400 bg-amber-500/20" };
  return { label: "Poor", class: "text-red-400 bg-red-500/20" };
}
</script>

<template>
  <div class="space-y-6" v-if="perf">
    <!-- Core Web Vitals Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="vital in [
          {
            key: 'lcp',
            label: 'LCP',
            value: perf.avg_lcp,
            unit: 'ms',
            desc: 'Largest Contentful Paint',
          },
          {
            key: 'fcp',
            label: 'FCP',
            value: perf.avg_fcp,
            unit: 'ms',
            desc: 'First Contentful Paint',
          },
          {
            key: 'cls',
            label: 'CLS',
            value: perf.avg_cls,
            unit: '',
            desc: 'Cumulative Layout Shift',
          },
          {
            key: 'ttfb',
            label: 'TTFB',
            value: perf.avg_ttfb,
            unit: 'ms',
            desc: 'Time to First Byte',
          },
        ]"
        :key="vital.key"
        class="bg-dark-900/60 backdrop-blur-sm border border-dark-800/50 rounded-2xl p-5"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-dark-400 uppercase">{{
            vital.label
          }}</span>
          <span
            class="text-xs px-2 py-0.5 rounded-full"
            :class="
              getVitalStatus(vital.key, parseFloat(vital.value || '0')).class
            "
          >
            {{
              getVitalStatus(vital.key, parseFloat(vital.value || "0")).label
            }}
          </span>
        </div>
        <div class="text-2xl font-bold text-dark-100">
          {{ vital.value || "-"
          }}<span class="text-sm text-dark-500 ml-1">{{ vital.unit }}</span>
        </div>
        <div class="text-xs text-dark-500 mt-1">{{ vital.desc }}</div>
      </div>
    </div>

    <!-- Samples info -->
    <div class="text-xs text-dark-500 text-right">
      Based on {{ parseInt(perf.samples || "0").toLocaleString() }} samples
    </div>

    <!-- Per-page Performance -->
    <div
      class="bg-dark-900/60 backdrop-blur-sm border border-dark-800/50 rounded-2xl p-6"
    >
      <h3 class="text-sm font-semibold text-dark-200 mb-4">
        Performance by Page
      </h3>
      <table class="w-full text-sm">
        <thead>
          <tr
            class="text-xs text-dark-400 uppercase border-b border-dark-800/50"
          >
            <th class="text-left py-3">Page</th>
            <th class="text-right py-3">LCP</th>
            <th class="text-right py-3">FCP</th>
            <th class="text-right py-3">CLS</th>
            <th class="text-right py-3">TTFB</th>
            <th class="text-right py-3">Samples</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in pages"
            :key="p.path"
            class="border-b border-dark-800/30"
          >
            <td class="py-2.5 text-dark-300 truncate max-w-xs">{{ p.path }}</td>
            <td
              class="py-2.5 text-right"
              :class="
                getVitalStatus('lcp', parseInt(p.avg_lcp || '0')).class.split(
                  ' ',
                )[0]
              "
            >
              {{ p.avg_lcp || "-" }}ms
            </td>
            <td
              class="py-2.5 text-right"
              :class="
                getVitalStatus('fcp', parseInt(p.avg_fcp || '0')).class.split(
                  ' ',
                )[0]
              "
            >
              {{ p.avg_fcp || "-" }}ms
            </td>
            <td
              class="py-2.5 text-right"
              :class="
                getVitalStatus('cls', parseFloat(p.avg_cls || '0')).class.split(
                  ' ',
                )[0]
              "
            >
              {{ p.avg_cls || "-" }}
            </td>
            <td
              class="py-2.5 text-right"
              :class="
                getVitalStatus('ttfb', parseInt(p.avg_ttfb || '0')).class.split(
                  ' ',
                )[0]
              "
            >
              {{ p.avg_ttfb || "-" }}ms
            </td>
            <td class="py-2.5 text-right text-dark-500">
              {{ parseInt(p.samples).toLocaleString() }}
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!pages.length" class="text-center py-8 text-dark-500">
        No performance data yet
      </div>
    </div>
  </div>
  <div v-else-if="!loading" class="text-center py-20 text-dark-500">
    ⚡ No performance data for this period
  </div>
</template>
