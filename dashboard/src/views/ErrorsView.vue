<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useWebsiteStore, useDateStore } from "../stores/index";
import { api } from "../lib/api";

const ws = useWebsiteStore();
const ds = useDateStore();
const errors = ref<any[]>([]);
const totalGroups = ref(0);
const expandedError = ref("");
const loading = ref(true);

async function fetchData() {
  if (!ws.currentId) return;
  loading.value = true;
  try {
    const res = await api.get("/errors", {
      params: { websiteId: ws.currentId, start: ds.start, end: ds.end },
    });
    errors.value = res.data.errors;
    totalGroups.value = res.data.totalGroups;
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
  <div class="space-y-6">
    <div
      class="bg-dark-900/60 backdrop-blur-sm border border-dark-800/50 rounded-2xl p-6"
    >
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-dark-200">
          Errors ({{ totalGroups }} unique)
        </h3>
      </div>
      <div class="space-y-3">
        <div
          v-for="err in errors"
          :key="err.message"
          class="bg-dark-800/30 rounded-xl overflow-hidden"
        >
          <button
            @click="
              expandedError = expandedError === err.message ? '' : err.message
            "
            class="w-full text-left p-4 hover:bg-dark-800/50 transition-colors"
          >
            <div class="flex items-center justify-between mb-1">
              <span
                class="text-sm text-red-400 font-medium truncate max-w-lg"
                >{{ err.message }}</span
              >
              <span
                class="text-sm font-bold text-dark-200 bg-red-500/20 px-2 py-0.5 rounded-full ml-3"
                >{{ parseInt(err.count) }}×</span
              >
            </div>
            <div class="flex gap-4 text-xs text-dark-500">
              <span
                >{{ parseInt(err.affected_sessions) }} sessions affected</span
              >
              <span>Last: {{ new Date(err.last_seen).toLocaleString() }}</span>
              <span v-if="err.last_browser">{{ err.last_browser }}</span>
            </div>
          </button>
          <!-- Expanded details -->
          <div
            v-if="expandedError === err.message"
            class="px-4 pb-4 border-t border-dark-700/50"
          >
            <div v-if="err.last_url" class="text-xs text-dark-400 mt-2">
              URL: {{ err.last_url }}
            </div>
            <pre
              v-if="err.last_stack"
              class="mt-2 text-xs text-dark-400 bg-dark-900/50 rounded-lg p-3 overflow-x-auto max-h-48"
              >{{ err.last_stack }}</pre
            >
          </div>
        </div>
        <div
          v-if="!errors.length && !loading"
          class="text-center py-10 text-dark-500"
        >
          🎉 No errors in this period
        </div>
      </div>
    </div>
  </div>
</template>
