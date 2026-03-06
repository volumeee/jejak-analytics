import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../lib/api.js';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('pa_token') || '');
  const user = ref<any>(null);

  const isAuthenticated = computed(() => !!token.value);

  async function login(username: string, password: string) {
    const res = await api.post('/auth/login', { username, password });
    token.value = res.data.token;
    user.value = res.data.user;
    localStorage.setItem('pa_token', res.data.token);
  }

  function logout() {
    token.value = '';
    user.value = null;
    localStorage.removeItem('pa_token');
  }

  return { token, user, isAuthenticated, login, logout };
});

export const useWebsiteStore = defineStore('website', () => {
  const websites = ref<any[]>([]);
  const current = ref<any>(null);
  const currentId = computed(() => current.value?.id || '');

  async function fetchWebsites() {
    const res = await api.get('/websites');
    websites.value = res.data.websites;
    if (!current.value && websites.value.length > 0) {
      current.value = websites.value[0];
    }
  }

  async function createWebsite(name: string, domain: string) {
    const res = await api.post('/websites', { name, domain });
    websites.value.unshift(res.data.website);
    current.value = res.data.website;
    return res.data.website;
  }

  function selectWebsite(website: any) {
    current.value = website;
  }

  return { websites, current, currentId, fetchWebsites, createWebsite, selectWebsite };
});

export const useDateStore = defineStore('date', () => {
  const end = ref(new Date().toISOString().split('T')[0]);
  const start = ref((() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  })());

  const presets = [
    { label: 'Today', days: 0 },
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Last 365 days', days: 365 },
  ];

  function setRange(days: number) {
    end.value = new Date().toISOString().split('T')[0];
    if (days === 0) {
      start.value = end.value;
    } else {
      const d = new Date();
      d.setDate(d.getDate() - days);
      start.value = d.toISOString().split('T')[0];
    }
  }

  return { start, end, presets, setRange };
});
