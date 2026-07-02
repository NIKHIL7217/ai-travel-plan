<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useOfflineStore } from "../stores/offline";
import { useVaultStore } from "../stores/vault";

const router = useRouter();
const authStore = useAuthStore();
const offlineStore = useOfflineStore();
const vaultStore = useVaultStore();

const selectedTag = ref("travel");
const uploadMessage = ref("");

const documents = computed(() => vaultStore.documents);
const encryptionMeta = computed(() => vaultStore.encryptionMeta);

function queueDocumentsOfflinePack() {
  if (!authStore.user?.uid || documents.value.length === 0) {
    return;
  }

  offlineStore.queueOfflinePack({
    type: "documents",
    title: `Document Vault Pack (${documents.value.length})`,
    source: "documents",
    payload: {
      count: documents.value.length,
      emergencyPackCount: Number(vaultStore.emergencyPackCount || 0),
      encryptedCount: Number(vaultStore.encryptedDocumentCount || 0),
      updatedAt: Date.now()
    }
  });

  uploadMessage.value = "Document vault offline pack saved for emergency access.";
  resetMessageWithDelay();
}

function handleRotateVaultKey() {
  vaultStore.rotateKey();
  uploadMessage.value = "Vault key version rotated and metadata refreshed.";
  resetMessageWithDelay();
}

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
  offlineStore.initForUser(authStore.user.uid);
});

watch(
  () => authStore.user?.uid,
  (nextUserId) => {
    if (!nextUserId) {
      return;
    }

    vaultStore.initForUser(nextUserId);
    offlineStore.initForUser(nextUserId);
  }
);
</script>

<template>
  <div class="documents-page container animate-fade-in" style="padding-top: 100px;">
    <div class="page-head">
      <h1>Secure Travel Vault</h1>
      <p>Organize passport, visa, tickets, insurance, and emergency records with encryption metadata and offline readiness.</p>
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
      <article class="stat-card glass-card">
        <span>Encryption</span>
        <strong>{{ vaultStore.encryptionStatusLabel }}</strong>
      </article>
      <article class="stat-card glass-card">
        <span>Encrypted Docs</span>
        <strong>{{ vaultStore.encryptedDocumentCount }}</strong>
      </article>
    </section>

    <section class="upload-card glass-card mt-6">
      <div class="upload-head">
        <h2>Add Documents</h2>
        <div class="upload-actions">
          <button type="button" class="btn btn-outline" @click="router.push('/planner')">Back to Planner</button>
          <button type="button" class="btn btn-outline" @click="router.push('/saved-trips')">Saved Trips</button>
          <button type="button" class="btn btn-outline" :disabled="documents.length === 0" @click="queueDocumentsOfflinePack">
            Save Offline Pack
          </button>
          <button type="button" class="btn btn-outline" @click="handleRotateVaultKey">
            Rotate Vault Key
          </button>
        </div>
      </div>

      <p class="security-note mt-3">
        Encryption mode: <strong>{{ encryptionMeta.enabled ? 'Enabled' : 'Metadata Only' }}</strong>
        · Algorithm: <strong>{{ encryptionMeta.algorithm }}</strong>
        · Key v<strong>{{ encryptionMeta.keyVersion }}</strong>
      </p>

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

<style scoped src="./styles/Documents.css"></style>
