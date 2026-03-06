<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/index";

const router = useRouter();
const auth = useAuthStore();
const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function handleLogin() {
  error.value = "";
  loading.value = true;
  try {
    await auth.login(username.value, password.value);
    router.push("/");
  } catch {
    error.value = "Invalid username or password";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-dark-950 px-4">
    <!-- Background gradient -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div
        class="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl"
      ></div>
      <div
        class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-400/5 rounded-full blur-3xl"
      ></div>
    </div>

    <div class="relative w-full max-w-sm">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div
          class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-600/30 mb-4"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            class="w-9 h-9"
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
        <h1 class="text-2xl font-bold text-dark-100">Jejak</h1>
        <p class="text-dark-400 text-sm mt-1">Self-hosted web analytics</p>
      </div>

      <!-- Form -->
      <div
        class="bg-dark-900/80 backdrop-blur-xl border border-dark-800/50 rounded-2xl p-8 shadow-2xl"
      >
        <form @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label class="block text-xs font-medium text-dark-400 mb-2"
              >Username</label
            >
            <input
              v-model="username"
              type="text"
              required
              autofocus
              class="w-full bg-dark-800/60 text-dark-100 rounded-xl px-4 py-3 text-sm border border-dark-700/50 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 focus:outline-none transition-all placeholder-dark-500"
              placeholder="admin"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-dark-400 mb-2"
              >Password</label
            >
            <input
              v-model="password"
              type="password"
              required
              class="w-full bg-dark-800/60 text-dark-100 rounded-xl px-4 py-3 text-sm border border-dark-700/50 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 focus:outline-none transition-all placeholder-dark-500"
              placeholder="••••••••"
            />
          </div>

          <div
            v-if="error"
            class="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2"
          >
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl py-3 text-sm font-semibold hover:from-primary-500 hover:to-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50 transition-all shadow-lg shadow-primary-600/20"
          >
            {{ loading ? "Logging in..." : "Login" }}
          </button>
        </form>
      </div>

      <p class="text-center text-dark-500 text-xs mt-6">
        Default: admin / admin123
      </p>
    </div>
  </div>
</template>
