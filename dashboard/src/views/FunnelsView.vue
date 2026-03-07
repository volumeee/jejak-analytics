<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useWebsiteStore, useDateStore } from "../stores/index";
import { api } from "../lib/api";

const ws = useWebsiteStore();
const ds = useDateStore();
const funnels = ref<any[]>([]);
const selectedFunnel = ref<any>(null);
const analysis = ref<any[]>([]);
const loading = ref(false);

const modalOpen = ref(false);
const newFunnel = ref({
  name: "",
  stepsInput: "",
});

async function createFunnel() {
  if (!newFunnel.value.name || !newFunnel.value.stepsInput) return;
  const steps = newFunnel.value.stepsInput
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0) // Remove empty strings from trailing commas
    .map((val) => {
      // Basic detection: if it starts with /, it's a pageview, otherwise it's an event
      const type = val.startsWith("/") ? "pageview" : "event";
      return { name: val, type, value: val };
    });

  if (steps.length < 2) {
    alert(
      "Funnel must have at least 2 steps (e.g., /, /pricing). Use commas to separate steps!",
    );
    return;
  }

  try {
    await api.post("/funnels", {
      websiteId: ws.currentId,
      name: newFunnel.value.name,
      steps,
    });
    modalOpen.value = false;
    newFunnel.value = { name: "", stepsInput: "" };
    fetchFunnels();
  } catch (e) {
    console.error(e);
  }
}

async function fetchFunnels() {
  if (!ws.currentId) return;
  try {
    const res = await api.get("/funnels", {
      params: { websiteId: ws.currentId },
    });
    funnels.value = res.data.funnels;
    if (funnels.value.length > 0 && !selectedFunnel.value) {
      selectedFunnel.value = funnels.value[0];
      await analyzeFunnel(funnels.value[0].id);
    }
  } catch (e) {
    console.error(e);
  }
}

async function analyzeFunnel(funnelId: string) {
  loading.value = true;
  try {
    const res = await api.get(`/funnels/${funnelId}/analyze`, {
      params: { start: ds.start, end: ds.end },
    });
    analysis.value = res.data.analysis;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

watch([() => ws.currentId], fetchFunnels);
onMounted(fetchFunnels);
</script>

<template>
  <div class="space-y-6">
    <!-- Funnel selector -->
    <div class="flex items-center justify-between gap-4 py-2">
      <div class="flex items-center gap-4">
        <select
          v-if="funnels.length"
          @change="
            (e: Event) => {
              const f = funnels.find(
                (x: any) => x.id === (e.target as HTMLSelectElement).value,
              );
              if (f) {
                selectedFunnel = f;
                analyzeFunnel(f.id);
              }
            }
          "
          class="bg-dark-800 text-dark-200 text-sm rounded-xl px-4 py-2.5 border border-dark-700 outline-none focus:border-primary-500 transition-all min-w-[200px]"
        >
          <option v-for="f in funnels" :key="f.id" :value="f.id">
            {{ f.name }}
          </option>
        </select>
      </div>

      <button
        @click="modalOpen = true"
        class="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary-600/20"
      >
        + Build Funnel
      </button>
    </div>

    <!-- Create Funnel Modal -->
    <div
      v-if="modalOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-dark-950/80 backdrop-blur-md p-4"
    >
      <div
        class="glass-card p-10 max-w-lg w-full shadow-2xl animate-slide-up border border-dark-700/50 bg-dark-900"
      >
        <h2
          class="text-xl font-black text-dark-100 uppercase tracking-tight mb-8"
        >
          Create Funnel
        </h2>

        <div class="space-y-6">
          <div>
            <label
              class="text-[10px] font-bold text-dark-500 uppercase tracking-widest block mb-2"
              >Funnel Name</label
            >
            <input
              v-model="newFunnel.name"
              placeholder="E.g. Checkout Flow"
              class="w-full bg-dark-800 text-dark-100 rounded-xl px-4 py-3 border border-dark-700 outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label
              class="text-[10px] font-bold text-dark-500 uppercase tracking-widest block mb-1"
              >Steps (Path or Event)</label
            >
            <p class="text-[10px] text-dark-600 mb-3 italic">
              Separate paths by commas, e.g. /, /pricing, /register
            </p>
            <input
              v-model="newFunnel.stepsInput"
              placeholder="/, /pricing, /success"
              class="w-full bg-dark-800 text-dark-100 rounded-xl px-4 py-3 border border-dark-700 outline-none focus:border-primary-500"
            />
          </div>

          <div class="flex gap-4 pt-4">
            <button
              @click="modalOpen = false"
              class="flex-1 py-3 bg-dark-800 text-dark-400 font-bold uppercase text-xs rounded-xl hover:bg-dark-700 transition-colors"
            >
              Cancel
            </button>
            <button
              @click="createFunnel"
              class="flex-1 py-3 bg-primary-600 text-white font-bold uppercase text-xs rounded-xl shadow-lg shadow-primary-600/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Funnel visualization -->
    <div
      class="bg-dark-900/60 backdrop-blur-sm border border-dark-800/50 rounded-2xl p-6"
    >
      <div v-if="loading" class="py-20 flex items-center justify-center">
        <div
          class="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"
        ></div>
      </div>
      <div v-else-if="analysis.length" class="space-y-4">
        <div v-for="(step, i) in analysis" :key="i" class="relative">
          <div class="flex items-center gap-4">
            <div
              class="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center text-primary-400 font-bold text-sm shrink-0"
            >
              {{ step.step }}
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm text-dark-200 font-medium">{{
                  step.name
                }}</span>
                <div class="flex items-center gap-3">
                  <span class="text-sm font-bold text-dark-100">{{
                    step.count
                  }}</span>
                  <span
                    class="text-xs px-2 py-0.5 rounded-full"
                    :class="
                      step.conversionRate >= 80
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : step.conversionRate >= 50
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                    "
                  >
                    {{ step.conversionRate }}%
                  </span>
                </div>
              </div>
              <!-- Progress bar -->
              <div class="w-full h-2 bg-dark-800 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all"
                  :style="{ width: `${step.conversionRate}%` }"
                ></div>
              </div>
            </div>
          </div>
          <div
            v-if="i < analysis.length - 1"
            class="ml-5 h-6 border-l-2 border-dark-700 border-dashed"
          ></div>
        </div>
      </div>
      <div
        v-else
        class="text-center py-24 flex flex-col items-center justify-center animate-fade-in"
      >
        <div
          class="w-20 h-20 bg-dark-800/50 rounded-full flex items-center justify-center mb-6 text-dark-500 text-4xl"
        >
          📈
        </div>
        <p class="text-dark-300 font-medium tracking-wide">
          No funnels configured
        </p>
        <p class="text-xs text-dark-500 mt-2 max-w-sm">
          Click the "Build Funnel" button above to start tracking multi-step
          conversion flows and find out where users drop off.
        </p>
      </div>
    </div>
  </div>
</template>
