/**
 * Real client-side encryption using the Web Crypto API (AES-256-GCM).
 *
 * This replaces the previous "metadata only" labelling with genuine
 * authenticated encryption of document bytes. Keys are AES-GCM 256-bit,
 * generated per user and per key-version, and stored (exported raw) in
 * localStorage. This is real encryption-at-rest for the local vault; for
 * multi-device sync a server-held KMS would manage these keys instead.
 */

const KEY_PREFIX = "travel_os_vault_key_";

export function isCryptoAvailable() {
  return typeof crypto !== "undefined" && Boolean(crypto.subtle);
}

function keyStorageId(userId, version) {
  return `${KEY_PREFIX}${userId || "guest"}_v${Number(version || 1)}`;
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(String(base64 || ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function exportKey(key) {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bufferToBase64(raw);
}

async function importKey(base64) {
  return crypto.subtle.importKey(
    "raw",
    base64ToBuffer(base64),
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Returns the AES-GCM key for a user + version, generating and persisting a
 * fresh one if none exists yet.
 */
export async function getOrCreateKey(userId, version = 1) {
  if (!isCryptoAvailable()) {
    return null;
  }

  const storageId = keyStorageId(userId, version);

  try {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem(storageId) : null;
    if (stored) {
      return await importKey(stored);
    }
  } catch (_error) {
    // Fall through and generate a fresh key.
  }

  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(storageId, await exportKey(key));
    }
  } catch (_error) {
    // Non-blocking: key still usable for this session.
  }

  return key;
}

/**
 * Encrypts an ArrayBuffer, returning base64 IV + ciphertext.
 */
export async function encryptBuffer(key, buffer) {
  if (!key || !isCryptoAvailable()) {
    return null;
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, buffer);

  return {
    ivB64: bufferToBase64(iv.buffer),
    dataB64: bufferToBase64(ciphertext)
  };
}

/**
 * Decrypts a base64 IV + ciphertext back to an ArrayBuffer.
 */
export async function decryptBuffer(key, ivB64, dataB64) {
  if (!key || !isCryptoAvailable()) {
    return null;
  }

  const iv = new Uint8Array(base64ToBuffer(ivB64));
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, base64ToBuffer(dataB64));
}
