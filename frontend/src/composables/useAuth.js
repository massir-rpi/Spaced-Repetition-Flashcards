import { ref, computed } from 'vue';
import { apiUrl, API_ENDPOINTS } from '../utils/api.js';

const user = ref(null);
const loading = ref(false);
const initialized = ref(false);

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value);
  console.log('isAuthenticated', isAuthenticated.value);

  // Check if user is authenticated
  async function checkAuth() {
    if (initialized.value || loading.value) return;
    
    loading.value = true;
    try {
      const response = await fetch(apiUrl(API_ENDPOINTS.CHECK_AUTH), {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        user.value = data.user;
      } else {
        user.value = null;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      user.value = null;
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  }

  // Login user
  async function login(username, password) {
    loading.value = true;
    try {
      const response = await fetch(apiUrl(API_ENDPOINTS.LOGIN), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (response.ok) {
        user.value = data.user;
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Login failed' };
    } finally {
      loading.value = false;
    }
  }

  // Signup user
  async function signup(username, password) {
    loading.value = true;
    try {
      const response = await fetch(apiUrl(API_ENDPOINTS.SIGNUP), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (response.ok) {
        user.value = data.user;
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Signup failed:', error);
      return { success: false, error: 'Signup failed' };
    } finally {
      loading.value = false;
    }
  }

  // Logout user
  async function logout() {
    loading.value = true;
    try {
      await fetch(apiUrl(API_ENDPOINTS.LOGOUT), {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      user.value = null;
      loading.value = false;
    }
  }

  // Return auth state and methods
  return {
    user: computed(() => user.value),
    isAuthenticated,
    loading: computed(() => loading.value),
    checkAuth,
    login,
    signup,
    logout
  };
}
