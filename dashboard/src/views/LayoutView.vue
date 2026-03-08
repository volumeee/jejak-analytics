<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuthStore, useWebsiteStore, useDateStore } from "../stores/index";
import { useRouter, useRoute } from "vue-router";
import { api } from "../lib/api";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const websiteStore = useWebsiteStore();
const dateStore = useDateStore();
const sidebarOpen = ref(true);

// Export state
const isExportOpen = ref(false);

// Share state
const isShareModalOpen = ref(false);
const shareExpiresIn = ref<number | null>(24);
const generatedShareUrl = ref("");
const isSharing = ref(false);

// Fetch websites on mount
websiteStore.fetchWebsites();

const navItems = [
  { path: "/", label: "Dashboard", icon: "📊", section: "main" },
  { path: "/realtime", label: "Real-time", icon: "⚡", section: "main" },
  { path: "/pages", label: "Pages", icon: "📄", section: "analytics" },
  { path: "/sources", label: "Sources", icon: "🔗", section: "analytics" },
  { path: "/visitors", label: "Visitors", icon: "👥", section: "analytics" },
  { path: "/heatmaps", label: "Heatmaps", icon: "🔥", section: "behavior" },
  { path: "/sessions", label: "Sessions", icon: "🎬", section: "behavior" },
  {
    path: "/ab-tests",
    label: "AB Experiments",
    icon: "🧪",
    section: "behavior",
  },
  { path: "/funnels", label: "Funnels", icon: "📈", section: "behavior" },
  {
    path: "/performance",
    label: "Performance",
    icon: "⚡",
    section: "technical",
  },
  { path: "/errors", label: "Errors", icon: "🐛", section: "technical" },
  { path: "/settings", label: "Settings", icon: "⚙️", section: "system" },
];

const navSections = computed(() => [
  {
    key: "main",
    label: "Overview",
    items: navItems.filter((i) => i.section === "main"),
  },
  {
    key: "analytics",
    label: "Analytics",
    items: navItems.filter((i) => i.section === "analytics"),
  },
  {
    key: "behavior",
    label: "Behavior",
    items: navItems.filter((i) => i.section === "behavior"),
  },
  {
    key: "technical",
    label: "Technical",
    items: navItems.filter((i) => i.section === "technical"),
  },
  {
    key: "system",
    label: "System",
    items: navItems.filter((i) => i.section === "system"),
  },
]);

function isPresetActive(days: number): boolean {
  if (days === -1) {
    return dateStore.start === "live";
  }
  if (dateStore.start === "live") {
    return false;
  }
  const now = new Date();
  if (days === 0) {
    return dateStore.start === dateStore.end;
  }
  const expectedStart = new Date();
  expectedStart.setDate(now.getDate() - days);
  return dateStore.start === expectedStart.toISOString().split("T")[0];
}

function logout() {
  auth.logout();
  router.push("/login");
}

function handleExport(type: string, format: string = "csv") {
  if (!websiteStore.currentId) return;
  const baseUrl =
    api.defaults.baseURL || import.meta.env.VITE_API_URL + "/api" || "/api";
  const url = `${baseUrl}/export/${type}?websiteId=${websiteStore.currentId}&start=${dateStore.start}&end=${dateStore.end}&format=${format}`;

  // Use a hidden iframe or link to trigger download with auth token in headers?
  // Since it's a GET, browser can just open URL if auth is via cookies.
  // Wait, we use Bearer token. We need to fetch and trigger download.
  fetchExport(url, `${type}_export.${format}`);
  isExportOpen.value = false;
}

async function fetchExport(url: string, filename: string) {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error(err);
    alert("Export failed");
  }
}

async function generateShareLink() {
  if (!websiteStore.currentId) return;
  isSharing.value = true;
  try {
    const res = await api.post("/share", {
      websiteId: websiteStore.currentId,
      expiresIn: shareExpiresIn.value,
    });
    // shareUrl comes formatted nicely, but let's transform it to current origin just in case
    const sharePath = `/#/shared/${res.data.token}`;
    generatedShareUrl.value = window.location.origin + sharePath;
  } catch (err) {
    console.error(err);
    alert("Failed to generate share link");
  } finally {
    isSharing.value = false;
  }
}

function copyShareUrl() {
  navigator.clipboard.writeText(generatedShareUrl.value);
  alert("Copied to clipboard!");
}
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <aside
      :class="[
        'flex flex-col bg-dark-900/80 backdrop-blur-xl border-r border-dark-800/50 transition-all duration-300 shrink-0',
        sidebarOpen ? 'w-60' : 'w-16',
      ]"
    >
      <!-- Logo -->
      <div
        class="flex items-center gap-3 px-4 h-16 border-b border-dark-800/50"
      >
        <div
          class="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-600/20 shrink-0"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            class="w-5 h-5"
            stroke="white"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M12 19c-1.5 0-3-1.5-3-4s1.5-5 3-7c1.5 2 3 3.5 3 7s-1.5 4-3 4z"
            />
            <circle cx="9" cy="6" r="1" fill="white" stroke="none" />
            <circle cx="12" cy="4" r="1" fill="white" stroke="none" />
            <circle cx="15" cy="6" r="1" fill="white" stroke="none" />
          </svg>
        </div>
        <span
          v-if="sidebarOpen"
          class="font-bold text-sm text-dark-100 whitespace-nowrap"
          >Jejak</span
        >
      </div>

      <!-- Website selector -->
      <div
        v-if="sidebarOpen && websiteStore.websites.length > 0"
        class="px-3 py-3 border-b border-dark-800/50"
      >
        <select
          :value="websiteStore.currentId"
          @change="
            websiteStore.selectWebsite(
              websiteStore.websites.find(
                (w: any) => w.id === ($event.target as HTMLSelectElement).value,
              ),
            )
          "
          class="w-full bg-dark-800/70 text-dark-200 text-xs rounded-lg px-3 py-2 border border-dark-700/50 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30 transition-all appearance-none cursor-pointer"
        >
          <option v-for="w in websiteStore.websites" :key="w.id" :value="w.id">
            {{ w.name }}
          </option>
        </select>
      </div>

      <!-- Nav items grouped by section -->
      <nav class="flex-1 py-2 overflow-y-auto">
        <template v-for="section in navSections" :key="section.key">
          <div v-if="sidebarOpen" class="px-4 pt-4 pb-1">
            <span
              class="text-[10px] font-semibold text-dark-600 uppercase tracking-widest"
              >{{ section.label }}</span
            >
          </div>
          <div v-else class="h-px bg-dark-800/40 mx-2 my-2"></div>
          <router-link
            v-for="item in section.items"
            :key="item.path"
            :to="item.path"
            :class="[
              'flex items-center gap-3 px-4 py-2 mx-2 rounded-xl text-sm transition-all duration-200 group relative',
              route.path === item.path
                ? 'bg-primary-600/15 text-primary-400 font-medium'
                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/50',
            ]"
          >
            <!-- Active indicator -->
            <div
              v-if="route.path === item.path"
              class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary-500"
            ></div>
            <span
              class="text-base shrink-0"
              :class="{ 'mx-auto': !sidebarOpen }"
              >{{ item.icon }}</span
            >
            <span v-if="sidebarOpen" class="whitespace-nowrap">{{
              item.label
            }}</span>
          </router-link>
        </template>
      </nav>

      <!-- Bottom -->
      <div class="border-t border-dark-800/50 p-3">
        <button
          @click="logout"
          class="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <span>🚪</span>
          <span v-if="sidebarOpen">Logout</span>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Top bar -->
      <header
        class="h-16 border-b border-dark-800/50 flex items-center justify-between px-6 bg-dark-900/40 backdrop-blur-sm shrink-0 z-50 relative"
      >
        <div class="flex items-center gap-4">
          <button
            @click="sidebarOpen = !sidebarOpen"
            class="text-dark-400 hover:text-dark-200 transition-colors p-1 rounded-lg hover:bg-dark-800/50"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h1 class="text-lg font-semibold text-dark-100">{{ route.name }}</h1>
        </div>

        <!-- Right Side Header Controls -->
        <div class="flex items-center gap-3">
          <!-- Share Button -->
          <button
            @click="
              isShareModalOpen = true;
              generatedShareUrl = '';
            "
            title="Share Dashboard"
            class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-800/60 border border-dark-700/50 text-dark-300 hover:text-white hover:bg-dark-700 hover:border-dark-600 transition-all text-sm font-medium"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              ></path>
            </svg>
            <span class="hidden sm:inline">Share</span>
          </button>

          <!-- Export Dropdown -->
          <div class="relative">
            <!-- Clickaway overlay to close dropdown -->
            <div
              v-if="isExportOpen"
              @click="isExportOpen = false"
              class="fixed inset-0 z-40"
            ></div>

            <button
              @click="isExportOpen = !isExportOpen"
              title="Export Data"
              class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-800/60 border border-dark-700/50 text-dark-300 hover:text-white hover:bg-dark-700 hover:border-dark-600 transition-all text-sm font-medium"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                ></path>
              </svg>
              <span class="hidden sm:inline">Export</span>
            </button>
            <div
              v-if="isExportOpen"
              class="absolute right-0 mt-2 w-48 bg-dark-800 border border-dark-700 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in"
            >
              <div
                class="px-3 py-2 text-xs font-semibold text-dark-400 bg-dark-900 border-b border-dark-700/50"
              >
                Export to CSV
              </div>
              <button
                @click="handleExport('pageviews', 'csv')"
                class="w-full text-left px-4 py-2 text-sm text-dark-300 hover:text-white hover:bg-primary-600/20 transition-colors"
              >
                Page Views
              </button>
              <button
                @click="handleExport('sessions', 'csv')"
                class="w-full text-left px-4 py-2 text-sm text-dark-300 hover:text-white hover:bg-primary-600/20 transition-colors"
              >
                Sessions
              </button>
              <button
                @click="handleExport('events', 'csv')"
                class="w-full text-left px-4 py-2 text-sm text-dark-300 hover:text-white hover:bg-primary-600/20 transition-colors"
              >
                Events
              </button>
              <button
                @click="handleExport('errors', 'csv')"
                class="w-full text-left px-4 py-2 text-sm text-dark-300 hover:text-white hover:bg-primary-600/20 transition-colors"
              >
                Error Logs
              </button>
            </div>
          </div>

          <div class="h-6 w-px bg-dark-700/50 mx-1"></div>

          <!-- Date range picker -->
          <div class="flex items-center gap-2">
            <div class="flex gap-1 bg-dark-800/60 rounded-xl p-1">
              <button
                v-for="preset in dateStore.presets"
                :key="preset.days"
                @click="dateStore.setRange(preset.days)"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                  isPresetActive(preset.days)
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                    : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50',
                ]"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto p-6">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- Share Modal -->
    <div
      v-if="isShareModalOpen"
      class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      @click.self="isShareModalOpen = false"
    >
      <div
        class="bg-dark-900 border border-dark-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative"
      >
        <h2 class="text-xl font-bold text-white mb-2">Share Dashboard</h2>
        <p class="text-dark-400 text-sm mb-6">
          Create a read-only link to share stats with clients or public.
        </p>

        <div class="space-y-4">
          <div class="relative">
            <label class="block text-xs font-medium text-dark-400 mb-1"
              >Link Expiration</label
            >
            <div class="relative">
              <select
                v-model="shareExpiresIn"
                style="appearance: none; background-image: none"
                class="w-full bg-dark-800 border border-dark-700 rounded-lg pl-4 pr-10 py-2.5 text-white focus:outline-none focus:border-primary-500 appearance-none"
              >
                <option :value="1">1 Hour</option>
                <option :value="24">24 Hours</option>
                <option :value="168">7 Days</option>
                <option :value="720">30 Days</option>
                <option :value="null">Never Expires</option>
              </select>
              <div
                class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-dark-400"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>
          </div>

          <button
            v-if="!generatedShareUrl"
            @click="generateShareLink"
            :disabled="isSharing"
            class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-medium px-4 py-3 rounded-xl hover:from-primary-500 hover:to-indigo-500 transition-all"
          >
            <span v-if="!isSharing">Generate Link</span>
            <span v-else class="animate-spin text-xl leading-none">⏳</span>
          </button>

          <div v-else class="animate-fade-in space-y-4 mt-6">
            <div
              class="p-3 bg-dark-800 border border-primary-500/30 rounded-xl flex items-center gap-3"
            >
              <input
                type="text"
                readonly
                :value="generatedShareUrl"
                class="w-full bg-transparent text-primary-400 text-sm outline-none font-medium truncate"
              />
            </div>
            <button
              @click="copyShareUrl"
              class="w-full bg-dark-700 hover:bg-dark-600 text-white font-medium px-4 py-3 rounded-xl transition-all shadow-sm"
            >
              Copy Link
            </button>
          </div>
        </div>

        <button
          @click="isShareModalOpen = false"
          class="absolute top-4 right-4 text-dark-400 hover:text-white transition-colors bg-dark-800 rounded-full p-1.5 focus:outline-none focus:ring-2 focus:ring-dark-600"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
