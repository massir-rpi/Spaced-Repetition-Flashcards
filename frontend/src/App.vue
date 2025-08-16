<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from './composables/useAuth.js';

const { user, isAuthenticated, checkAuth, logout } = useAuth();
const router = useRouter();

onMounted(() => {
  checkAuth();
});

async function handleLogout() {
  await logout(); // Logout user
  router.push('/login'); // Redirect to login page
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Vocab Flashcards</h1>
      <nav class="app-nav" v-if="isAuthenticated">
        <router-link to="/">Study</router-link>
        <router-link to="/admin">Admin</router-link>
        <div class="user-info">
          <span class="username">{{ user?.username }}</span>
          <button class="btn btn-ghost" @click="handleLogout">Logout</button>
        </div>
      </nav>
    </header>

    <main class="app-main">
      <router-view v-if="isAuthenticated" />
      <div v-else class="auth-prompt">
        <router-view />
      </div>
    </main>
  </div>
  
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.app-title {
  margin: 0;
  font-size: 1.1rem;
}

.app-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 1rem;
  padding-left: 1rem;
  border-left: 1px solid var(--color-border);
}

.username {
  color: var(--color-muted);
  font-size: 0.875rem;
}

.app-main {
  max-width: 900px;
  margin: 1rem auto;
  padding: 0 1rem;
}
</style>
