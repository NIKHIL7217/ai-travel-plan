import { defineStore } from "pinia";
import { computed, ref } from "vue";

const STORAGE_PREFIX = "travel_os_vault_docs_";
const ENCRYPTION_STORAGE_PREFIX = "travel_os_vault_encryption_";

function formatBytes(bytes) {
  const size = Number(bytes || 0);
  if (!size || size <= 0) {
    return "0 KB";
  }

  const kb = size / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(2)} MB`;
  }

  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function readDocs(storageKey) {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function readEncryptionMeta(storageKey) {
  if (typeof localStorage === "undefined") {
    return {
      enabled: true,
      algorithm: "AES-256-GCM",
      keyVersion: 1,
      lastRotatedAt: 0
    };
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return {
        enabled: true,
        algorithm: "AES-256-GCM",
        keyVersion: 1,
        lastRotatedAt: 0
      };
    }

    const parsed = JSON.parse(raw);
    return {
      enabled: parsed?.enabled !== false,
      algorithm: String(parsed?.algorithm || "AES-256-GCM"),
      keyVersion: Number(parsed?.keyVersion || 1),
      lastRotatedAt: Number(parsed?.lastRotatedAt || 0)
    };
  } catch (_error) {
    return {
      enabled: true,
      algorithm: "AES-256-GCM",
      keyVersion: 1,
      lastRotatedAt: 0
    };
  }
}

function normalizeDocument(input = {}) {
  return {
    id: String(input.id || `doc_${Date.now()}_${Math.random().toString(16).slice(2)}`),
    name: String(input.name || "Untitled Document").trim() || "Untitled Document",
    type: String(input.type || "application/octet-stream").trim() || "application/octet-stream",
    size: Number(input.size || 0),
    sizeLabel: String(input.sizeLabel || formatBytes(input.size || 0)),
    tag: String(input.tag || "travel").trim() || "travel",
    emergencyPack: Boolean(input.emergencyPack),
    source: String(input.source || "local").trim() || "local",
    isEncrypted: input.isEncrypted !== false,
    encryptionAlgorithm: String(input.encryptionAlgorithm || "AES-256-GCM"),
    keyVersion: Number(input.keyVersion || 1),
    uploadedAt: Number(input.uploadedAt || Date.now())
  };
}

export const useVaultStore = defineStore("vault", () => {
  const userId = ref("guest");
  const documents = ref([]);
  const encryptionMeta = ref({
    enabled: true,
    algorithm: "AES-256-GCM",
    keyVersion: 1,
    lastRotatedAt: 0
  });

  const storageKey = computed(() => `${STORAGE_PREFIX}${userId.value || "guest"}`);
  const encryptionStorageKey = computed(() => `${ENCRYPTION_STORAGE_PREFIX}${userId.value || "guest"}`);

  const totalSizeBytes = computed(() =>
    documents.value.reduce((sum, document) => sum + Number(document.size || 0), 0)
  );
  const totalSizeLabel = computed(() => formatBytes(totalSizeBytes.value));
  const emergencyPackCount = computed(() => documents.value.filter((document) => document.emergencyPack).length);
  const encryptedDocumentCount = computed(() => documents.value.filter((document) => document.isEncrypted).length);

  const encryptionStatusLabel = computed(() => {
    if (!encryptionMeta.value.enabled) {
      return "Metadata Only";
    }

    return `${encryptionMeta.value.algorithm} (v${encryptionMeta.value.keyVersion})`;
  });

  function persist() {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
      localStorage.setItem(storageKey.value, JSON.stringify(documents.value));
    } catch (_error) {
      // Local persistence is best-effort.
    }
  }

  function persistEncryptionMeta() {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
      localStorage.setItem(encryptionStorageKey.value, JSON.stringify(encryptionMeta.value));
    } catch (_error) {
      // Local persistence is best-effort.
    }
  }

  function initForUser(nextUserId = "guest") {
    userId.value = String(nextUserId || "guest").trim() || "guest";
    documents.value = readDocs(storageKey.value).map((item) => normalizeDocument(item));
    encryptionMeta.value = readEncryptionMeta(encryptionStorageKey.value);
  }

  function addDocument(file, options = {}) {
    if (!file) {
      return null;
    }

    const nextDocument = normalizeDocument({
      name: file.name,
      type: file.type,
      size: file.size,
      tag: options.tag || "travel",
      emergencyPack: Boolean(options.emergencyPack),
      isEncrypted: encryptionMeta.value.enabled,
      encryptionAlgorithm: encryptionMeta.value.algorithm,
      keyVersion: encryptionMeta.value.keyVersion,
      source: "local"
    });

    documents.value = [nextDocument, ...documents.value].slice(0, 200);
    persist();

    return nextDocument;
  }

  function removeDocument(documentId) {
    documents.value = documents.value.filter((document) => document.id !== documentId);
    persist();
  }

  function rotateKey() {
    encryptionMeta.value = {
      ...encryptionMeta.value,
      keyVersion: Number(encryptionMeta.value.keyVersion || 1) + 1,
      lastRotatedAt: Date.now()
    };

    documents.value = documents.value.map((document) => ({
      ...document,
      keyVersion: encryptionMeta.value.keyVersion,
      encryptionAlgorithm: encryptionMeta.value.algorithm,
      isEncrypted: encryptionMeta.value.enabled
    }));

    persistEncryptionMeta();
    persist();
  }

  function setEncryptionEnabled(enabled) {
    encryptionMeta.value = {
      ...encryptionMeta.value,
      enabled: Boolean(enabled)
    };

    documents.value = documents.value.map((document) => ({
      ...document,
      isEncrypted: Boolean(enabled),
      encryptionAlgorithm: encryptionMeta.value.algorithm,
      keyVersion: encryptionMeta.value.keyVersion
    }));

    persistEncryptionMeta();
    persist();
  }

  function toggleEmergencyPack(documentId) {
    documents.value = documents.value.map((document) => {
      if (document.id !== documentId) {
        return document;
      }

      return {
        ...document,
        emergencyPack: !document.emergencyPack
      };
    });
    persist();
  }

  function clearDocuments() {
    documents.value = [];
    persist();
  }

  initForUser("guest");

  return {
    userId,
    documents,
    encryptionMeta,
    totalSizeBytes,
    totalSizeLabel,
    emergencyPackCount,
    encryptedDocumentCount,
    encryptionStatusLabel,
    initForUser,
    addDocument,
    removeDocument,
    toggleEmergencyPack,
    clearDocuments,
    rotateKey,
    setEncryptionEnabled
  };
});
