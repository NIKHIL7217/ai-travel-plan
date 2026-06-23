<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useVaultStore } from "../stores/vault";

const router = useRouter();
const authStore = useAuthStore();
const vaultStore = useVaultStore();

const selectedTag = ref("travel");
const uploadMessage = ref("");

const documents = computed(() => vaultStore.documents);

function formatDate(timestamp) {
  return new Date(Number(timestamp || Date.now())).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function resetMessageWithDelay() {
  setTimeout(() => {
    uploadMessage.value = "";
  }, 2200);
}

function onSelectFiles(event) {
  const files = Array.from(event?.target?.files || []);
  if (!files.length) {
    return;
  }

  files.forEach((file) => {
    vaultStore.addDocument(file, {
      tag: selectedTag.value,
      emergencyPack: false
    });
  });

  uploadMessage.value = `${files.length} document${files.length > 1 ? "s" : ""} added to local vault.`;
  resetMessageWithDelay();
  event.target.value = "";
}

onMounted(async () => {
  await authStore.initAuth();
  if (!authStore.user?.uid) {
    router.replace({ path: "/login", query: { redirect: "/documents" } });
    return;
  }

  vaultStore.initForUser(authStore.user.uid);
});

watch(
  () => authStore.user?.uid,
  (nextUserId) => {
    if (!nextUserId) {
      return;
    }

    vaultStore.initForUser(nextUserId);
  }
);
</script>

<template>
  <div class="documents-page container animate-fade-in" style="padding-top: 100px;">
    <div class="page-head">
      <span class="docs-badge">DOCUMENT VAULT</span>
      <h1>Travel Document Vault</h1>
      <p>Secure metadata index for passport, visa, tickets, insurance, and emergency docs. File blobs stay local in this phase.</p>
    </div>

    <section class="stats-grid mt-6">
      <article class="stat-card glass-card">
        <span>Total Documents</span>
        <strong>{{ documents.length }}</strong>
      </article>
      <article class="stat-card glass-card">
        <span>Total Vault Size</span>
        <strong>{{ vaultStore.totalSizeLabel }}</strong>
      </article>
      <article class="stat-card glass-card">
        <span>Emergency Pack</span>
        <strong>{{ vaultStore.emergencyPackCount }}</strong>
      </article>
    </section>

    <section class="upload-card glass-card mt-6">
      <div class="upload-head">
        <h2>Add Documents</h2>
        <div class="upload-actions">
          <button type="button" class="btn btn-outline" @click="router.push('/planner')">Back to Planner</button>
          <button type="button" class="btn btn-outline" @click="router.push('/saved-trips')">Saved Trips</button>
        </div>
      </div>

      <div class="upload-grid mt-4">
        <label>
          <span>Category</span>
          <select class="form-select" v-model="selectedTag">
            <option value="travel">Travel</option>
            <option value="identity">Identity</option>
            <option value="medical">Medical</option>
            <option value="payments">Payments</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label class="file-input-wrap">
          <span>Select Files</span>
          <input class="form-input" type="file" multiple @change="onSelectFiles" />
        </label>
      </div>

      <p v-if="uploadMessage" class="upload-message mt-3">{{ uploadMessage }}</p>
    </section>

    <section class="list-card glass-card mt-6">
      <div class="list-head">
        <h3>Vault Index</h3>
        <button type="button" class="btn btn-outline btn-xs" @click="vaultStore.clearDocuments" :disabled="documents.length === 0">
          Clear All
        </button>
      </div>

      <p v-if="documents.length === 0" class="empty-label mt-3">
        No documents added yet. Upload files to start your travel vault.
      </p>

      <div v-else class="doc-grid mt-4">
        <article v-for="document in documents" :key="document.id" class="doc-item">
          <div class="doc-head">
            <h4>{{ document.name }}</h4>
            <span class="doc-tag">{{ document.tag }}</span>
          </div>

          <div class="doc-meta mt-2">
            <span>{{ document.type || "Unknown" }}</span>
            <span>{{ document.sizeLabel }}</span>
            <span>{{ formatDate(document.uploadedAt) }}</span>
          </div>

          <div class="doc-actions mt-3">
            <button type="button" class="btn btn-outline btn-xs" @click="vaultStore.toggleEmergencyPack(document.id)">
              {{ document.emergencyPack ? "Remove Emergency" : "Add Emergency" }}
            </button>
            <button type="button" class="btn btn-outline btn-xs" @click="vaultStore.removeDocument(document.id)">Remove</button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.documents-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 28px;
}

.page-head h1 {
  margin: 8px 0;
  font-size: clamp(1.9rem, 4vw, 2.6rem);
}

.page-head p {
  color: var(--color-text-secondary);
  max-width: 780px;
}

.docs-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #1d4ed8;
  background: rgba(219, 234, 254, 0.9);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
}

.mt-6 {
  margin-top: 24px;
}

.mt-4 {
  margin-top: 16px;
}

.mt-3 {
  margin-top: 12px;
}

.mt-2 {
  margin-top: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  background: #ffffff !important;
}

.stat-card span {
  display: block;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}

.stat-card strong {
  margin-top: 8px;
  display: block;
  font-size: 1.18rem;
}

.upload-card,
.list-card {
  background: #ffffff !important;
}

.upload-head,
.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.upload-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.upload-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.upload-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.upload-message {
  font-size: 0.82rem;
  color: #0f766e;
}

.empty-label {
  color: var(--color-text-muted);
  font-size: 0.84rem;
}

.doc-grid {
  display: grid;
  gap: 10px;
}

.doc-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px;
  background: #ffffff;
}

.doc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.doc-head h4 {
  font-size: 0.92rem;
}

.doc-tag {
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: 999px;
  background: rgba(239, 246, 255, 0.82);
  color: #1d4ed8;
  padding: 4px 9px;
  font-size: 0.68rem;
  font-weight: 700;
}

.doc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.doc-meta span {
  font-size: 0.74rem;
  color: var(--color-text-secondary);
}

.doc-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-xs {
  font-size: 0.72rem;
  padding: 8px 11px;
}

@media (max-width: 980px) {
  .stats-grid,
  .upload-grid {
    grid-template-columns: 1fr;
  }
}
</style>
