<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuthStore, useWebsiteStore, useDateStore } from "../stores/index";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const websiteStore = useWebsiteStore();
const dateStore = useDateStore();
const sidebarOpen = ref(true);

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
        class="h-16 border-b border-dark-800/50 flex items-center justify-between px-6 bg-dark-900/40 backdrop-blur-sm shrink-0"
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
  </div>
</template>
