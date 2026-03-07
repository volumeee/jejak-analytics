<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useWebsiteStore, useDateStore } from "../stores/index";
import { api } from "../lib/api";

const ws = useWebsiteStore();
const ds = useDateStore();
const sourceType = ref("referrer");
const sources = ref<any[]>([]);
const loading = ref(true);

const types = [
  { value: "referrer", label: "Referrers" },
  { value: "utm_source", label: "UTM Source" },
  { value: "utm_medium", label: "UTM Medium" },
  { value: "utm_campaign", label: "Campaigns" },
];

async function fetchData() {
  if (!ws.currentId) return;
  loading.value = true;
  try {
    const res = await api.get("/stats/sources", {
      params: {
        websiteId: ws.currentId,
        start: ds.start,
        end: ds.end,
        type: sourceType.value,
      },
    });
    sources.value = res.data.sources;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

watch(
  [() => ws.currentId, () => ds.start, () => ds.end, sourceType],
  fetchData,
);
onMounted(fetchData);
</script>

<template>
  <div class="space-y-6">
    <!-- Source type tabs -->
    <div class="flex gap-2">
      <button
        v-for="t in types"
        :key="t.value"
        @click="sourceType = t.value"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-medium transition-all',
          sourceType === t.value
            ? 'bg-primary-600 text-white'
            : 'bg-dark-800/60 text-dark-400 hover:text-dark-200',
        ]"
      >
        {{ t.label }}
      </button>
    </div>

    <div
      class="bg-dark-900/60 backdrop-blur-sm border border-dark-800/50 rounded-2xl p-6"
    >
      <table class="w-full text-sm">
        <thead>
          <tr
            class="text-xs text-dark-400 uppercase tracking-wider border-b border-dark-800/50"
          >
            <th class="text-left py-3 pr-4">Source</th>
            <th class="text-right py-3 px-4">Sessions</th>
            <th class="text-right py-3 px-4">Visitors</th>
            <th class="text-right py-3 pl-4">Bounce Rate</th>
          </tr>
        </thead>
        <tbody v-if="loading">
          <tr
            v-for="i in 5"
            :key="`skeleton-${i}`"
            class="animate-pulse border-b border-dark-800/20"
          >
            <td class="py-4 pr-4">
              <div class="h-4 bg-dark-800/40 rounded w-1/2"></div>
            </td>
            <td class="py-4 px-4">
              <div class="h-4 bg-dark-800/40 rounded w-1/3 ml-auto"></div>
            </td>
            <td class="py-4 px-4">
              <div class="h-4 bg-dark-800/40 rounded w-1/3 ml-auto"></div>
            </td>
            <td class="py-4 pl-4">
              <div class="h-4 bg-dark-800/40 rounded w-1/4 ml-auto"></div>
            </td>
          </tr>
        </tbody>
        <tbody v-else-if="sources.length > 0">
          <tr
            v-for="s in sources"
            :key="s.source"
            class="border-b border-dark-800/30 hover:bg-dark-800/20 transition-colors"
          >
            <td class="py-3 pr-4 text-dark-200 font-medium">{{ s.source }}</td>
            <td class="py-3 px-4 text-right text-dark-300">
              {{ parseInt(s.sessions).toLocaleString() }}
            </td>
            <td class="py-3 px-4 text-right text-dark-400">
              {{ parseInt(s.visitors).toLocaleString() }}
            </td>
            <td class="py-3 pl-4 text-right">
              <span
                :class="
                  parseFloat(s.bounce_rate) > 70
                    ? 'text-red-400'
                    : parseFloat(s.bounce_rate) > 50
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                "
                >{{ s.bounce_rate }}%</span
              >
            </td>
          </tr>
        </tbody>
      </table>
      <div
        v-if="!sources.length && !loading"
        class="text-center py-16 flex flex-col items-center justify-center animate-fade-in"
      >
        <div
          class="w-16 h-16 bg-dark-800/50 rounded-full flex items-center justify-center mb-4 text-dark-500"
        >
          <svg
            class="w-8 h-8"
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
        <p class="text-dark-300 font-medium tracking-wide">No sources found</p>
        <p class="text-xs text-dark-500 mt-1 max-w-xs">
          There is no traffic source data available for the selected period.
        </p>
      </div>
    </div>
  </div>
</template>
