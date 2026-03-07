<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useWebsiteStore } from "../stores/index";
import { api } from "../lib/api";

const ws = useWebsiteStore();
const tests = ref<any[]>([]);
const loading = ref(true);
const selectedTest = ref<any>(null);
const testResults = ref<any>(null);
const resultsLoading = ref(false);

// New Test Modal
const modalOpen = ref(false);
const newTest = ref({
  name: "",
  description: "",
  goalEvent: "purchase",
  variants: [
    { name: "Original", weight: 50 },
    { name: "Variant A", weight: 50 },
  ],
});

async function fetchTests() {
  if (!ws.currentId) return;
  loading.value = true;
  try {
    const res = await api.get("/ab-tests", {
      params: { websiteId: ws.currentId },
    });
    tests.value = res.data.tests;
    if (tests.value.length > 0 && !selectedTest.value) {
      selectTest(tests.value[0]);
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function selectTest(test: any) {
  selectedTest.value = test;
  resultsLoading.value = true;
  try {
    const res = await api.get(`/ab-tests/${test.id}/results`);
    testResults.value = res.data;
  } catch (e) {
    console.error(e);
  } finally {
    resultsLoading.value = false;
  }
}

async function createTest() {
  if (!newTest.value.name) return;
  try {
    await api.post("/ab-tests", {
      ...newTest.value,
      websiteId: ws.currentId,
    });
    modalOpen.value = false;
    fetchTests();
  } catch (e) {
    console.error(e);
  }
}

async function updateStatus(testId: string, status: string) {
  try {
    await api.patch(`/ab-tests/${testId}/status`, { status });
    fetchTests();
    if (selectedTest.value?.id === testId) {
      selectTest({ ...selectedTest.value, status });
    }
  } catch (e) {
    console.error(e);
  }
}

watch([() => ws.currentId], fetchTests);
onMounted(fetchTests);
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Header/Actions -->
    <div class="flex items-center justify-between">
      <button
        @click="modalOpen = true"
        class="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary-600/20"
      >
        + Create A/B Test
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left: Test List -->
      <div class="lg:col-span-4 space-y-4">
        <div class="glass-card p-6">
          <h3
            class="text-sm font-bold text-dark-200 uppercase tracking-widest mb-6"
          >
            Experiments
          </h3>
          <div class="space-y-3">
            <div
              v-for="t in tests"
              :key="t.id"
              @click="selectTest(t)"
              :class="[
                'p-4 rounded-2xl cursor-pointer transition-all border',
                selectedTest?.id === t.id
                  ? 'bg-primary-600/10 border-primary-500/50'
                  : 'bg-dark-800/20 border-dark-700/30 hover:border-dark-600',
              ]"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-bold text-dark-100">{{
                  t.name
                }}</span>
                <span
                  :class="[
                    'text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-widest',
                    t.status === 'running'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-dark-700 text-dark-400',
                  ]"
                  >{{ t.status }}</span
                >
              </div>
              <p class="text-xs text-dark-500 line-clamp-1">
                {{ t.description || "No description" }}
              </p>
            </div>

            <div
              v-if="!tests.length && !loading"
              class="text-center py-12 flex flex-col items-center justify-center animate-fade-in"
            >
              <div
                class="w-12 h-12 bg-dark-800/50 rounded-full flex items-center justify-center mb-3 text-dark-500"
              >
                <span class="text-xl">🧪</span>
              </div>
              <p class="text-xs font-medium text-dark-400">
                No experiments yet
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Results -->
      <div class="lg:col-span-8">
        <div v-if="selectedTest" class="glass-card p-8 space-y-8">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-black text-dark-100">
                {{ selectedTest.name }}
              </h2>
              <p class="text-dark-500 mt-1">{{ selectedTest.description }}</p>
            </div>

            <div class="flex gap-2">
              <button
                v-if="selectedTest.status !== 'running'"
                @click="updateStatus(selectedTest.id, 'running')"
                class="px-4 py-2 bg-emerald-600/20 text-emerald-400 text-[10px] font-bold uppercase rounded-lg border border-emerald-500/30"
              >
                Start Test
              </button>
              <button
                v-if="selectedTest.status === 'running'"
                @click="updateStatus(selectedTest.id, 'paused')"
                class="px-4 py-2 bg-amber-600/20 text-amber-400 text-[10px] font-bold uppercase rounded-lg border border-amber-500/30"
              >
                Pause
              </button>
              <button
                @click="updateStatus(selectedTest.id, 'completed')"
                class="px-4 py-2 bg-dark-700 text-dark-300 text-[10px] font-bold uppercase rounded-lg"
              >
                End Test
              </button>
            </div>
          </div>

          <!-- Goal Info -->
          <div
            class="flex items-center gap-4 bg-dark-800/30 p-4 rounded-2xl border border-dark-700/30"
          >
            <div
              class="p-3 bg-primary-500/10 text-primary-400 rounded-xl text-xl"
            >
              🎯
            </div>
            <div>
              <p
                class="text-[10px] font-bold text-dark-500 uppercase tracking-widest"
              >
                Goal Event
              </p>
              <p class="text-sm font-bold text-dark-200">
                {{ selectedTest.goal_event || "any_pageview" }}
              </p>
            </div>
          </div>

          <!-- Results Table -->
          <div v-if="testResults" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="r in testResults.results"
                :key="r.name"
                class="p-6 rounded-3xl bg-dark-800/40 border border-dark-700/50 group"
              >
                <div class="flex items-center justify-between mb-4">
                  <span
                    class="text-sm font-bold text-dark-100 group-hover:text-primary-400 transition-colors"
                    >{{ r.name }}</span
                  >
                  <span class="text-[10px] font-bold text-dark-500"
                    >{{ r.weight }}% traffic</span
                  >
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <p
                      class="text-[10px] font-bold text-dark-600 uppercase tracking-widest"
                    >
                      Visitors
                    </p>
                    <p class="text-xl font-black text-dark-100">
                      {{ r.total }}
                    </p>
                  </div>
                  <div>
                    <p
                      class="text-[10px] font-bold text-dark-600 uppercase tracking-widest"
                    >
                      Conversions
                    </p>
                    <p class="text-xl font-black text-emerald-400">
                      {{ r.conversions }}
                    </p>
                  </div>
                </div>

                <!-- Rate Progress -->
                <div class="mt-6">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-bold text-dark-500"
                      >CONVERSION RATE</span
                    >
                    <span class="text-xs font-black text-dark-100"
                      >{{ r.conversionRate }}%</span
                    >
                  </div>
                  <div
                    class="w-full h-2 bg-dark-900 rounded-full overflow-hidden"
                  >
                    <div
                      class="h-full bg-emerald-500"
                      :style="{ width: `${r.conversionRate}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="testResults.isSignificant"
              class="bg-primary-500/10 border border-primary-500/30 rounded-2xl p-4 flex items-center gap-3"
            >
              <span class="text-xl">✨</span>
              <p class="text-xs text-primary-300">
                Results are statistically significant! You can now confidently
                pick a winner.
              </p>
            </div>
            <div
              v-else
              class="bg-dark-800/50 rounded-2xl p-4 flex items-center gap-3"
            >
              <span class="text-xl">⏳</span>
              <p class="text-xs text-dark-500">
                Need more data for significance. Current sample size:
                {{ testResults.totalSamples }}/100+
              </p>
            </div>
          </div>

          <div
            v-else-if="resultsLoading"
            class="py-20 flex flex-col items-center justify-center gap-3"
          >
            <div
              class="w-8 h-8 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"
            ></div>
            <span
              class="text-xs font-bold text-dark-600 uppercase tracking-widest"
              >Syncing results...</span
            >
          </div>
        </div>

        <div
          v-else
          class="glass-card p-20 flex flex-col items-center justify-center grayscale opacity-30"
        >
          <div class="text-6xl mb-4">🧪</div>
          <p class="text-dark-400 font-bold uppercase tracking-widest text-sm">
            Select an experiment to view results
          </p>
        </div>
      </div>
    </div>

    <!-- Create Modal (Simplified) -->
    <div
      v-if="modalOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-dark-950/80 backdrop-blur-md p-4"
    >
      <div
        class="bg-dark-900 border border-dark-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-slide-up"
      >
        <h2
          class="text-xl font-black text-dark-100 uppercase tracking-tight mb-6"
        >
          New Experiment
        </h2>

        <div class="space-y-4">
          <div>
            <label
              class="text-[10px] font-bold text-dark-500 uppercase tracking-widest block mb-1"
              >Test Name</label
            >
            <input
              v-model="newTest.name"
              placeholder="E.g. Pricing Page Header"
              class="w-full bg-dark-800 text-dark-100 rounded-xl px-4 py-3 border border-dark-700 outline-none focus:border-primary-500"
            />
          </div>
          <div>
            <label
              class="text-[10px] font-bold text-dark-500 uppercase tracking-widest block mb-1"
              >Goal Event Name</label
            >
            <input
              v-model="newTest.goalEvent"
              placeholder="E.g. purchase_click"
              class="w-full bg-dark-800 text-dark-100 rounded-xl px-4 py-3 border border-dark-700 outline-none focus:border-primary-500"
            />
          </div>

          <div class="flex gap-4">
            <button
              @click="modalOpen = false"
              class="flex-1 py-3 bg-dark-800 text-dark-400 font-bold uppercase text-xs rounded-xl"
            >
              Cancel
            </button>
            <button
              @click="createTest"
              class="flex-1 py-3 bg-primary-600 text-white font-bold uppercase text-xs rounded-xl shadow-lg shadow-primary-600/20"
            >
              Create Test
            </button>
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
  border-radius: 2rem;
}
</style>
