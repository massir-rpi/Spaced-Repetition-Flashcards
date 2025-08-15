<script setup>
import { onMounted, ref } from 'vue';

const loading = ref(false);
const currentCard = ref(null);
const showDefinition = ref(false);
const statusMessage = ref('');

async function loadNext() {
  loading.value = true;
  showDefinition.value = false;
  try {
    const res = await fetch('/api/next', {
      credentials: 'include'
    });
    const data = await res.json();
    currentCard.value = data.card;
    statusMessage.value = data.statusMessage || '';
  } catch (e) {
    statusMessage.value = 'Failed to load next card.';
  } finally {
    loading.value = false;
  }
}

async function submitAnswer(result) {
  if (!currentCard.value) return;
  loading.value = true;
  try {
    await fetch(`/api/review/${currentCard.value.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ result })
    });
  } catch {}
  await loadNext();
}

onMounted(() => {
  loadNext();
});
</script>

<template>
  <section class="study">
    <h2>Study</h2>
    <div v-if="loading" class="hint">Loading…</div>
    <div v-else>
      <div v-if="statusMessage" class="hint">{{ statusMessage }}</div>
      <div v-else-if="currentCard" class="card study-card">
        <div class="term">{{ currentCard.term }}</div>
        <div v-if="showDefinition" class="definition">{{ currentCard.definition }}</div>
        <div class="actions">
          <button class="btn btn-primary" @click="showDefinition = true" :disabled="showDefinition">Show definition</button>
          <button v-if="showDefinition" class="btn" @click="submitAnswer('correct')">I got it</button>
          <button v-if="showDefinition" class="btn btn-ghost" @click="submitAnswer('incorrect')">I did not get it</button>
        </div>
      </div>
      <div v-else class="hint">No cards available.</div>
    </div>
  </section>
  
</template>

<style scoped>
.study {
  max-width: 720px;
  margin: 1.25rem auto;
  padding: 0 1rem;
}
.hint {
  color: var(--color-muted);
}
.study-card {
  margin-top: 0.5rem;
}
.term {
  font-size: 1.5rem;
  font-weight: 800;
}
.definition {
  margin-top: 0.75rem;
  color: #111827;
}
.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>


