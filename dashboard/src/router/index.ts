import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/LoginView.vue') },
  {
    path: '/',
    component: () => import('../views/LayoutView.vue'),
    children: [
      { path: '', name: 'Dashboard', component: () => import('../views/DashboardView.vue') },
      { path: 'pages', name: 'Pages', component: () => import('../views/PagesView.vue') },
      { path: 'sources', name: 'Sources', component: () => import('../views/SourcesView.vue') },
      { path: 'visitors', name: 'Visitors', component: () => import('../views/VisitorsView.vue') },
      { path: 'realtime', name: 'Realtime', component: () => import('../views/RealtimeView.vue') },
      { path: 'heatmaps', name: 'Heatmaps', component: () => import('../views/HeatmapsView.vue') },
      { path: 'sessions', name: 'Sessions', component: () => import('../views/SessionsView.vue') },
      { path: 'ab-tests', name: 'ABTests', component: () => import('../views/ABTestsView.vue') },
      { path: 'funnels', name: 'Funnels', component: () => import('../views/FunnelsView.vue') },
      { path: 'performance', name: 'Performance', component: () => import('../views/PerformanceView.vue') },
      { path: 'errors', name: 'Errors', component: () => import('../views/ErrorsView.vue') },
      { path: 'settings', name: 'Settings', component: () => import('../views/SettingsView.vue') },
    ],
  },
  { path: '/shared/:token', name: 'Shared', component: () => import('../views/SharedView.vue') },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// Auth guard
router.beforeEach((to) => {
  const token = localStorage.getItem('pa_token');
  if (!token && to.name !== 'Login' && to.name !== 'Shared') return { name: 'Login' };
  if (token && to.name === 'Login') return { name: 'Dashboard' };
});
