import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '../composables/useAuth.js';

import StudyView from '../views/StudyView.vue';
import AdminView from '../views/AdminView.vue';
import LoginView from '../views/LoginView.vue';

const routes = [
  { path: '/', name: 'study', component: StudyView, meta: { requiresAuth: true } },
  { path: '/admin', name: 'admin', component: AdminView, meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: LoginView }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const { isAuthenticated } = useAuth();
  
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next('/login');
  } else if (to.name === 'login' && isAuthenticated.value) {
    next('/');
  } else {
    next();
  }
});

export default router;


