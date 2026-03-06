<script setup lang="ts">
import { ref, computed } from "vue";
import { useWebsiteStore } from "../stores/index";

const ws = useWebsiteStore();
const newName = ref("");
const newDomain = ref("");
const adding = ref(false);
const message = ref("");

// Documentation Language
const lang = ref<'en' | 'id'>('en'); // Default to English
const toggleLang = () => {
  lang.value = lang.value === 'en' ? 'id' : 'en';
};

async function addWebsite() {
  if (!newName.value || !newDomain.value) return;
  adding.value = true;
  message.value = "";
  try {
    const website = await ws.createWebsite(newName.value, newDomain.value);
    message.value = `✅ Website "${website.name}" added!`;
    newName.value = "";
    newDomain.value = "";
  } catch (e: any) {
    message.value = `❌ ${e.response?.data?.error || "Failed to add website"}`;
  } finally {
    adding.value = false;
  }
}

const currentApiUrl = computed(() => {
  // Try to determine API URL from current location or env
  return import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3100`;
});

function getTrackerSnippet(websiteId: string): string {
  const apiUrl = currentApiUrl.value;
  return `<script defer src="${apiUrl}/tracker.js"
  data-website-id="${websiteId}"
  data-api="${apiUrl}"
  data-heatmap="true"
  data-performance="true"
  data-errors="true"
  data-recording="true"
  data-sample-rate="1"><\/script>`;
}
</script>

<template>
  <div class="space-y-8 mx-auto pb-20 animate-fade-in">
    <!-- Header with Language Toggle -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-800 pb-6">
      <!-- <div>
        <h2 class="text-2xl font-black text-dark-100 uppercase tracking-tight">
          {{ lang === 'en' ? 'Settings & Setup' : 'Pengaturan & Setup' }}
        </h2>
        <p class="text-dark-400 mt-1">
          {{ lang === 'en' ? 'Manage your websites and integration guides' : 'Kelola website dan panduan integrasi Anda' }}
        </p>
      </div> -->
      
      <button 
        @click="toggleLang"
        class="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-xl border border-dark-700 transition-all group shrink-0"
      >
        <span :class="lang === 'id' ? 'text-primary-400 font-bold' : 'text-dark-400'">ID</span>
        <div class="w-px h-3 bg-dark-600"></div>
        <span :class="lang === 'en' ? 'text-primary-400 font-bold' : 'text-dark-400'">EN</span>
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Left Column: Website Management -->
      <div class="lg:col-span-5 space-y-6">
        <!-- Add website -->
        <div class="glass-card p-6">
          <h3 class="text-sm font-bold text-dark-200 uppercase tracking-widest mb-4">
            {{ lang === 'en' ? 'Add New Website' : 'Tambah Website Baru' }}
          </h3>
          <form @submit.prevent="addWebsite" class="space-y-4">
            <div class="space-y-3">
              <input
                v-model="newName"
                placeholder="Name (e.g. My Shop)"
                class="w-full bg-dark-800/60 text-dark-200 rounded-xl px-4 py-3 text-sm border border-dark-700/50 focus:border-primary-500 focus:outline-none transition-all"
              />
              <input
                v-model="newDomain"
                placeholder="domain.com"
                class="w-full bg-dark-800/60 text-dark-200 rounded-xl px-4 py-3 text-sm border border-dark-700/50 focus:border-primary-500 focus:outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              :disabled="adding"
              class="w-full px-5 py-3 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-500 transition-all disabled:opacity-50 shadow-lg shadow-primary-600/20"
            >
              {{ adding ? (lang === 'en' ? 'Adding...' : 'Menambahkan...') : (lang === 'en' ? 'Add Website' : 'Tambah Website') }}
            </button>
            <div
              v-if="message"
              class="text-xs font-medium text-center"
              :class="message.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'"
            >
              {{ message }}
            </div>
          </form>
        </div>

        <!-- Website list -->
        <div class="glass-card p-6">
          <h3 class="text-sm font-bold text-dark-200 uppercase tracking-widest mb-4">
            {{ lang === 'en' ? 'Your Websites' : 'Website Anda' }}
          </h3>
          <div class="space-y-3">
            <div
              v-for="w in ws.websites"
              :key="w.id"
              class="group relative bg-dark-800/30 rounded-2xl p-4 border border-dark-700/30 hover:border-primary-500/30 transition-all"
              :class="{ 'ring-1 ring-primary-500/50 bg-primary-500/5': ws.currentId === w.id }"
            >
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-bold text-dark-100">{{ w.name }}</div>
                  <div class="text-[10px] text-dark-500 font-mono mt-0.5">{{ w.domain }}</div>
                </div>
                <button
                  @click="ws.selectWebsite(w)"
                  :class="
                    ws.currentId === w.id
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'bg-dark-700 text-dark-400 hover:text-dark-100 hover:bg-dark-600'
                  "
                  class="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider"
                >
                  {{ ws.currentId === w.id ? (lang === 'en' ? 'Active' : 'Aktif') : (lang === 'en' ? 'Select' : 'Pilih') }}
                </button>
              </div>
            </div>
            
            <div v-if="!ws.websites.length" class="text-center py-12 text-dark-600 text-sm">
              <div class="text-3xl mb-2">🌐</div>
              {{ lang === 'en' ? 'No websites added yet' : 'Belum ada website' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Documentation -->
      <div class="lg:col-span-7 space-y-8">
        <!-- Main Snippet -->
        <div class="glass-card p-8">
          <h3 class="text-lg font-bold text-dark-100 mb-4 flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm">1</span>
            {{ lang === 'en' ? 'Installation' : 'Instalasi' }}
          </h3>
          
          <p class="text-dark-400 text-sm mb-4 leading-relaxed">
            {{ lang === 'en' 
              ? 'Copy and paste this script tag into the <head> of your website.' 
              : 'Salin dan tempel tag script ini ke dalam <head> website Anda.' 
            }}
          </p>

          <div v-if="ws.current" class="space-y-4">
            <div class="bg-dark-950/80 rounded-2xl p-5 border border-dark-800 relative group overflow-hidden">
              <div class="absolute top-4 right-4 text-dark-600 text-[10px] uppercase font-bold tracking-widest">HTML</div>
              <pre class="text-xs text-emerald-400 font-mono overflow-x-auto selection:bg-emerald-500/20 whitespace-pre-wrap">{{ getTrackerSnippet(ws.currentId) }}</pre>
            </div>
          </div>
          <div v-else class="py-10 text-center bg-dark-800/20 rounded-2xl border border-dashed border-dark-700 text-dark-500 text-sm italic">
            {{ lang === 'en' ? 'Select or add a website above to get your tracker snippet' : 'Pilih atau tambah website di samping untuk mendapat kode tracker' }}
          </div>
        </div>

        <!-- tracking detail docs -->
        <div class="glass-card p-8 space-y-8">
          <!-- Event Tracking -->
          <div>
            <h3 class="text-lg font-bold text-dark-100 mb-4 flex items-center gap-2">
              <span class="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">2</span>
              {{ lang === 'en' ? 'Event Tracking' : 'Pelacakan Event' }}
            </h3>

            <div class="space-y-6">
              <div class="space-y-3">
                <h4 class="text-sm font-bold text-dark-200">{{ lang === 'en' ? 'Declarative (Recommended)' : 'Deklaratif (Direkomendasikan)' }}</h4>
                <p class="text-dark-400 text-xs leading-relaxed">
                  {{ lang === 'en'
                    ? 'Track interactions without writing code. Use data-jj-event attribute.'
                    : 'Lacak interaksi tanpa menulis kode. Gunakan atribut data-jj-event.'
                  }}
                </p>
                <div class="bg-dark-950/80 rounded-xl p-4 font-mono text-[11px] text-primary-400 border border-dark-800">
                  <code>
                    &lt;button <br>
                    &nbsp;&nbsp;data-jj-event="cta_click"<br>
                    &nbsp;&nbsp;data-jj-label="Hero Button"&gt;<br>
                    &nbsp;&nbsp;Sign Up Now<br>
                    &lt;/button&gt;
                  </code>
                </div>
              </div>

              <div class="space-y-3">
                <h4 class="text-sm font-bold text-dark-200">{{ lang === 'en' ? 'Programmatic (JavaScript)' : 'Programatik (JavaScript)' }}</h4>
                <p class="text-dark-400 text-xs leading-relaxed">
                  {{ lang === 'en'
                    ? 'Call track() manually from your logic.'
                    : 'Panggil track() secara manual dari logika Anda.'
                  }}
                </p>
                <div class="bg-dark-950/80 rounded-xl p-4 font-mono text-[11px] text-amber-400 border border-dark-800">
                  <code>
                    Jejak.track('purchase', {<br>
                    &nbsp;&nbsp;amount: 25.99,<br>
                    &nbsp;&nbsp;currency: 'USD'<br>
                    });
                  </code>
                </div>
              </div>
            </div>
          </div>

          <div class="h-px bg-dark-800/50"></div>

          <!-- A/B Testing -->
          <div>
            <h3 class="text-lg font-bold text-dark-100 mb-4 flex items-center gap-2">
              <span class="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center text-sm">4</span>
              {{ lang === 'en' ? 'A/B Testing' : 'Uji Coba A/B' }}
            </h3>
            
            <p class="text-dark-400 text-xs mb-4 leading-relaxed">
              {{ lang === 'en' 
                ? 'Create experiments in the AB Experiments tab and use these attributes on your elements.' 
                : 'Buat eksperimen di tab AB Experiments dan gunakan atribut ini pada elemen Anda.' 
              }}
            </p>

            <div class="bg-dark-950/80 rounded-xl p-4 font-mono text-[11px] text-pink-400 border border-dark-800">
              <code>
                &lt;div data-jj-ab-test="TEST_ID" data-jj-ab-variant="A"&gt;<br>
                &nbsp;&nbsp;Show Variant A<br>
                &lt;/div&gt;<br>
                &lt;div data-jj-ab-test="TEST_ID" data-jj-ab-variant="B"&gt;<br>
                &nbsp;&nbsp;Show Variant B<br>
                &lt;/div&gt;
              </code>
            </div>
          </div>

          <div class="h-px bg-dark-800/50"></div>

          <!-- Feature Flags -->
          <div>
            <h3 class="text-lg font-bold text-dark-100 mb-4 flex items-center gap-2">
              <span class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm">5</span>
              {{ lang === 'en' ? 'Feature Modules' : 'Modul Fitur' }}
            </h3>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="p-3 rounded-xl bg-dark-800/40 border border-dark-700/50">
                <div class="text-[10px] font-bold text-emerald-400 uppercase mb-1">Heatmaps</div>
                <div class="text-[10px] text-dark-400 font-mono">data-heatmap="true"</div>
              </div>
              <div class="p-3 rounded-xl bg-dark-800/40 border border-dark-700/50">
                <div class="text-[10px] font-bold text-emerald-400 uppercase mb-1">Performance</div>
                <div class="text-[10px] text-dark-400 font-mono">data-performance="true"</div>
              </div>
              <div class="p-3 rounded-xl bg-dark-800/40 border border-dark-700/50">
                <div class="text-[10px] font-bold text-emerald-400 uppercase mb-1">Errors</div>
                <div class="text-[10px] text-dark-400 font-mono">data-errors="true"</div>
              </div>
              <div class="p-3 rounded-xl bg-dark-800/40 border border-dark-700/50">
                <div class="text-[10px] font-bold text-amber-400 uppercase mb-1">Recording</div>
                <div class="text-[10px] text-dark-400 font-mono">data-recording="true"</div>
              </div>
            </div>
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
