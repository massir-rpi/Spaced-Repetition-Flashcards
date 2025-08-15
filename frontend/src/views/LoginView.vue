<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth.js';

const router = useRouter();
const { login, signup, loading } = useAuth();

const isSignupMode = ref(false);
const username = ref('');
const password = ref('');
const error = ref('');

async function handleSubmit() {
  error.value = '';
  
  if (!username.value || !password.value) {
    error.value = 'Username and password are required';
    return;
  }

  const result = isSignupMode.value 
    ? await signup(username.value, password.value)
    : await login(username.value, password.value);

  if (result.success) {
    router.push('/');
  } else {
    error.value = result.error || 'Authentication failed';
  }
}

function toggleMode() {
  isSignupMode.value = !isSignupMode.value;
  error.value = '';
  username.value = '';
  password.value = '';
}
</script>

<template>
  <section class="login">
    <div class="login-card card">
      <h2>{{ isSignupMode ? 'Sign Up' : 'Log In' }}</h2>
      
      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <label for="username">Username:</label>
          <input 
            v-model="username" 
            type="text" 
            placeholder="Enter your username"
            :disabled="loading"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Password:</label>
          <input 
            v-model="password" 
            type="password" 
            placeholder="Enter your password"
            :disabled="loading"
            required
          />
        </div>

        <div v-if="error" class="error">{{ error }}</div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Loading...' : (isSignupMode ? 'Sign Up' : 'Log In') }}
          </button>
        </div>
      </form>

      <div class="mode-toggle">
        <p>
          {{ isSignupMode ? 'Already have an account?' : "Don't have an account?" }}
          <a href="#" @click.prevent="toggleMode">
            {{ isSignupMode ? 'Log In' : 'Sign Up' }}
          </a>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.login {
  max-width: 400px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.login-card {
  text-align: center;
}

.login-form {
  margin-top: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
  color: var(--color-text);
}

.form-group input {
  width: 100%;
  box-sizing: border-box;
}

.error {
  color: #ef4444;
  background: #fef2f2;
  padding: 0.5rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.form-actions {
  margin-top: 1.5rem;
}

.form-actions .btn {
  width: 100%;
  text-align: center;
  display: flex;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  letter-spacing: 0.025em;
}

.mode-toggle {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.mode-toggle p {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.875rem;
}

.mode-toggle a {
  color: var(--color-primary);
  text-decoration: none;
}

.mode-toggle a:hover {
  text-decoration: underline;
}
</style>
