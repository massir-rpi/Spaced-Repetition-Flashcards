<script setup>
import { onMounted, ref } from 'vue';
import { apiUrl, API_ENDPOINTS } from '../utils/api.js';
import EditText from '../component/EditText.vue';

const term = ref('');
const definition = ref('');
const cards = ref([]);
const loading = ref(false);

async function fetchCards() {
  const res = await fetch(apiUrl(API_ENDPOINTS.CARDS), {
    credentials: 'include'
  });
  cards.value = await res.json();
}

async function createCard() {
  if (!term.value.trim() || !definition.value.trim()) return;
  loading.value = true;
  try {
    await fetch(apiUrl(API_ENDPOINTS.CARDS), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ term: term.value, definition: definition.value })
    });
    term.value = '';
    definition.value = '';
    await fetchCards();
  } finally {
    loading.value = false;
  }
}

async function deleteCard(id) {
  if (!id) return;
  loading.value = true;
  try {
    await fetch(apiUrl(API_ENDPOINTS.DELETE_CARD(id)), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    await fetchCards();
  } finally {
    loading.value = false;
  }
}

async function updateCard(id, term, definition) {
  if (!id) return;
  loading.value = true;
  try {
    await fetch(`/api/cards/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term, definition })
    });
  } finally {
    loading.value = false;
  }
}

function formatMs(ms) {
  if (ms === null || ms === undefined) return '';
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.ceil(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.ceil(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.ceil(h / 24);
  return `${d}d`;
}

onMounted(() => {
  fetchCards();
});
</script>

<template>
  <section class="admin">
    <h2>Admin</h2>
    <div class="creator card">
      <div class="inputs">
        <input v-model="term" placeholder="Term" />
        <input v-model="definition" placeholder="Definition" />
      </div>
      <div class="actions">
        <button class="btn btn-primary" :disabled="loading" @click="createCard">Create</button>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Term</th>
            <th>Definition</th>
            <th>Bin</th>
            <th>Time to next</th>
            <th>Incorrect count</th>
            <th>Status</th>
            <th>Delete?</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in cards" :key="c.id">
            <td>{{ c.id }}</td>
            <td>
              <edit-text 
                v-model="c.term" 
                :on-save="(newTerm) => updateCard(c.id, newTerm, c.definition)"
                input-type="input"
              />
            </td>
            <td>
              <edit-text
                v-model="c.definition" 
                :on-save="(newDefinition) => updateCard(c.id, c.term, newDefinition)"
                input-type="textarea"
              />
            </td>
            <td>{{ c.bin }}</td>
            <td>{{ formatMs(c.timeToNextMs) }}</td>
            <td>{{ c.incorrectCount }}</td>
            <td>{{ c.status }}</td>
            <td>
              <button class="btn btn-danger" :disabled="loading" @click="deleteCard(c.id)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.admin {
  max-width: 2000px;
  margin: 1.25rem auto;
  padding: 0 1rem;
}
.creator {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.creator .inputs {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 0.75rem;
}
.creator .actions {
  display: flex;
  justify-content: flex-end;
}
.table-wrap {
  overflow-x: visible;
}
</style>


