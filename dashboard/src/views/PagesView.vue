<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useWebsiteStore, useDateStore } from "../stores/index";
import { api } from "../lib/api";

const ws = useWebsiteStore();
const ds = useDateStore();
const pages = ref<any[]>([]);
const loading = ref(true);

async function fetchData() {
  if (!ws.currentId) return;
  loading.value = true;
  try {
    const res = await api.get("/stats/pages", {
      params: {
        websiteId: ws.currentId,
        start: ds.start,
        end: ds.end,
        limit: 50,
      },
    });
    pages.value = res.data.pages;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

watch([() => ws.currentId, () => ds.start, () => ds.end], fetchData);
onMounted(fetchData);
</script>

<template>
  <div
    class="bg-dark-900/60 backdrop-blur-sm border border-dark-800/50 rounded-2xl p-6"
  >
    <h3 class="text-sm font-semibold text-dark-200 mb-4">All Pages</h3>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr
            class="text-xs text-dark-400 uppercase tracking-wider border-b border-dark-800/50"
          >
            <th class="text-left py-3 pr-4">Page</th>
            <th class="text-right py-3 px-4">Views</th>
            <th class="text-right py-3 px-4">Visitors</th>
            <th class="text-right py-3 pl-4">Avg Time</th>
          </tr>
        </thead>
        <tbody v-if="loading">
          <tr
            v-for="i in 5"
            :key="`skeleton-${i}`"
            class="animate-pulse border-b border-dark-800/20"
          >
            <td class="py-4 pr-4">
              <div class="h-4 bg-dark-800/40 rounded w-3/4"></div>
            </td>
            <td class="py-4 px-4">
              <div class="h-4 bg-dark-800/40 rounded w-1/2 ml-auto"></div>
            </td>
            <td class="py-4 px-4">
              <div class="h-4 bg-dark-800/40 rounded w-1/2 ml-auto"></div>
            </td>
            <td class="py-4 pl-4">
              <div class="h-4 bg-dark-800/40 rounded w-1/3 ml-auto"></div>
            </td>
          </tr>
        </tbody>
        <tbody v-else-if="pages.length > 0">
          <tr
            v-for="page in pages"
            :key="page.path"
            class="border-b border-dark-800/30 hover:bg-dark-800/20 transition-colors"
          >
            <td
              class="py-3 pr-4 text-dark-200 truncate max-w-sm"
              :title="page.path"
            >
              {{ page.path }}
              <span
                v-if="page.title"
                class="block text-xs text-dark-500 truncate"
                >{{ page.title }}</span
              >
            </td>
            <td class="py-3 px-4 text-right text-dark-300 font-medium">
              {{ parseInt(page.views).toLocaleString() }}
            </td>
            <td class="py-3 px-4 text-right text-dark-400">
              {{ parseInt(page.visitors).toLocaleString() }}
            </td>
            <td class="py-3 pl-4 text-right text-dark-400">
              {{ page.avg_time ? Math.round(page.avg_time) + "s" : "-" }}
            </td>
          </tr>
        </tbody>
      </table>

      <div
        v-if="!pages.length && !loading"
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p class="text-dark-300 font-medium tracking-wide">No pages found</p>
        <p class="text-xs text-dark-500 mt-1 max-w-xs">
          There is no pageview data available for the selected period.
        </p>
      </div>
    </div>
  </div>
</template>
