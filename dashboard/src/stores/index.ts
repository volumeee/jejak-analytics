import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../lib/api.js';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('jj_token') || '');
  const user = ref<any>(null);

  const isAuthenticated = computed(() => !!token.value);

  async function login(username: string, password: string) {
    const res = await api.post('/auth/login', { username, password });
    token.value = res.data.token;
    user.value = res.data.user;
    localStorage.setItem('jj_token', res.data.token);
  }

  function logout() {
    token.value = '';
    user.value = null;
    localStorage.removeItem('jj_token');
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
    
    // Recovery script for hard-refresh
    const savedId = localStorage.getItem('jj_last_website_id');
    if (websites.value.length > 0) {
      if (savedId) {
        const found = websites.value.find(w => w.id === savedId);
        current.value = found || websites.value[0];
      } else {
        current.value = websites.value[0];
      }
    }
  }

  async function createWebsite(name: string, domain: string) {
    const res = await api.post('/websites', { name, domain });
    websites.value.unshift(res.data.website);
    selectWebsite(res.data.website); // Use selectWebsite to also trigger saving logic
    return res.data.website;
  }

  function selectWebsite(website: any) {
    current.value = website;
    if (website && website.id) {
        localStorage.setItem('jj_last_website_id', website.id);
    }
  }

  async function deleteWebsite(id: string) {
    await api.delete(`/websites/${id}`);
    websites.value = websites.value.filter(w => w.id !== id);
    if (current.value?.id === id) {
      if (websites.value.length > 0) {
        selectWebsite(websites.value[0]);
      } else {
        current.value = null;
        localStorage.removeItem('jj_last_website_id');
      }
    }
  }

  return { websites, current, currentId, fetchWebsites, createWebsite, selectWebsite, deleteWebsite };
});

export const useDateStore = defineStore('date', () => {
  const end = ref('live');
  const start = ref('live');

  const presets = [
    { label: 'Live (Last 1 Hour)', days: -1 },
    { label: 'Today', days: 0 },
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Last 365 days', days: 365 },
  ];

  function setRange(days: number) {
    localStorage.setItem('jj_last_date_days', days.toString());
    
    if (days === -1) {
      start.value = 'live';
      end.value = 'live';
      return;
    }
    end.value = new Date().toISOString().split('T')[0];
    if (days === 0) {
      start.value = end.value;
    } else {
      const d = new Date();
      d.setDate(d.getDate() - days);
      start.value = d.toISOString().split('T')[0];
    }
  }

  // Restore preset from localStorage
  const savedDays = localStorage.getItem('jj_last_date_days');
  const initialDays = savedDays ? parseInt(savedDays) : -1;
  setRange(initialDays);

  return { start, end, presets, setRange };
});
