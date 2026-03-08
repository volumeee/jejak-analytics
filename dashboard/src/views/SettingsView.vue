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

async function deleteSite(id: string) {
  if (!confirm(lang.value === 'en' ? 'Are you sure you want to delete this website? All analytics data will be lost.' : 'Apakah Anda yakin ingin menghapus website ini? Semua data analytics akan hilang.')) return;
  try {
    await ws.deleteWebsite(id);
  } catch (e: any) {
    message.value = `❌ ${e.response?.data?.error || "Failed to delete website"}`;
  }
}

function getTrackerSnippet(websiteId: string): string {
  const apiUrl = "https://your-server.com";
  return `<script defer type="text/javascript">
  const script = document.createElement('script');
  script.defer = true;
  script.src = \`\${apiUrl}/jejak.js?v=\${new Date().getTime()}\`;
  script.setAttribute('data-app-id', '${websiteId}');
  script.setAttribute('data-host', '\${apiUrl}');
  script.setAttribute('data-h', 'true');
  script.setAttribute('data-p', 'true');
  script.setAttribute('data-e', 'true');
  script.setAttribute('data-r', 'true');
  script.setAttribute('data-sr', '1');
  document.head.appendChild(script);
<\\/script>`;
}
</script>

<template>
  <div class="space-y-8 mx-auto pb-20 animate-fade-in">
    <!-- Header with Language Toggle -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-800 pb-6">
      <div>
        <h2 class="text-2xl font-black text-dark-100 uppercase tracking-tight">
          {{ lang === 'en' ? 'Settings & Setup' : 'Pengaturan & Setup' }}
        </h2>
        <div class="flex items-center gap-2 mt-1">
          <span class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">Stealth Mode On</span>
          <p class="text-dark-400 text-xs">
            {{ lang === 'en' ? 'Anti-adblock features enabled' : 'Fitur anti-adblock diaktifkan' }}
          </p>
        </div>
      </div>
      
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
                <div class="flex items-center gap-2">
                  <button
                    @click="deleteSite(w.id)"
                    class="text-red-400 hover:text-red-300 hover:bg-red-400/10 px-2 py-1.5 rounded-lg transition-all"
                    title="Delete Website"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
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
            </div>
            
            <div v-if="!ws.websites.length" class="text-center py-16 flex flex-col items-center justify-center animate-fade-in">
              <div class="w-16 h-16 bg-dark-800/50 rounded-full flex items-center justify-center mb-4 text-dark-500 text-3xl">
                🌐
              </div>
              <p class="text-dark-300 font-medium tracking-wide">
                {{ lang === 'en' ? 'No websites added yet' : 'Belum ada website' }}
              </p>
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
            <span class="font-bold text-amber-500">
              {{ lang === 'en' ? 'Important: ' : 'Penting: ' }}
            </span>
            {{ lang === 'en' 
              ? 'Replace "https://your-server.com" with your actual Jejak server URL. Copy and paste this script tag into the <head> of your website.' 
              : 'Ganti "https://your-server.com" dengan URL server Jejak Anda yang sebenarnya. Salin dan tempel tag script ini ke dalam <head> website.' 
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
                    Jejak.track('upgrade', {<br>
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
              <div class="p-3 rounded-xl bg-dark-800/40 border border-dark-700/50 group hover:border-emerald-500/30 transition-all">
                <div class="text-[10px] font-bold text-emerald-400 uppercase mb-1 flex items-center gap-1.5">
                  Heatmaps 
                  <span class="text-[8px] bg-emerald-500/10 px-1 rounded text-emerald-300">Enhanced</span>
                </div>
                <div class="text-[10px] text-dark-400 font-mono">data-h="true"</div>
              </div>
              <div class="p-3 rounded-xl bg-dark-800/40 border border-dark-700/50 group hover:border-emerald-500/30 transition-all">
                <div class="text-[10px] font-bold text-emerald-400 uppercase mb-1 flex items-center gap-1.5">
                  Real-time
                  <span class="text-[8px] bg-emerald-500/10 px-1 rounded text-emerald-300">Live Feed</span>
                </div>
                <div class="text-[10px] text-dark-400 font-mono">Enabled by default</div>
              </div>
              <div class="p-3 rounded-xl bg-dark-800/40 border border-dark-700/50">
                <div class="text-[10px] font-bold text-emerald-400 uppercase mb-1">Performance</div>
                <div class="text-[10px] text-dark-400 font-mono">data-p="true"</div>
              </div>
              <div class="p-3 rounded-xl bg-dark-800/40 border border-dark-700/50">
                <div class="text-[10px] font-bold text-amber-400 uppercase mb-1">Recording</div>
                <div class="text-[10px] text-dark-400 font-mono">data-r="true"</div>
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
