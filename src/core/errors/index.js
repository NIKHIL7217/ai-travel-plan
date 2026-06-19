export const ERROR_CODES = {
  UNKNOWN: "UNKNOWN",
  OFFLINE: "OFFLINE",
  TIMEOUT: "TIMEOUT",
  NETWORK: "NETWORK",
  API: "API",
  AUTH: "AUTH",
  VALIDATION: "VALIDATION"
};

export class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "AppError";
    this.code = options.code || ERROR_CODES.UNKNOWN;
    this.status = options.status || null;
    this.retryable = Boolean(options.retryable);
    this.userMessage = options.userMessage || "Something went wrong. Please try again.";
    this.context = options.context || {};
    this.cause = options.cause;
  }
}

export function isOfflineError(error) {
  if (!error) {
    return false;
  }

  if (error.code === ERROR_CODES.OFFLINE) {
    return true;
  }

  return String(error.message || "").toLowerCase().includes("offline");
}

function inferCode(error) {
  if (!error) {
    return ERROR_CODES.UNKNOWN;
  }

  if (error.name === "AbortError") {
    return ERROR_CODES.TIMEOUT;
  }

  const message = String(error.message || "").toLowerCase();

  if (message.includes("offline") || message.includes("network")) {
    return ERROR_CODES.NETWORK;
  }

  return ERROR_CODES.UNKNOWN;
}

export function normalizeError(error, context = {}) {
  if (error instanceof AppError) {
    return error;
  }

  const code = inferCode(error);

  const fallbackMessages = {
    [ERROR_CODES.TIMEOUT]: "Request timed out. Please retry.",
    [ERROR_CODES.NETWORK]: "Network issue detected. Please check your connection.",
    [ERROR_CODES.UNKNOWN]: "Unexpected issue occurred. Please retry."
  };

  return new AppError(error?.message || "Unknown error", {
    code,
    retryable: code === ERROR_CODES.TIMEOUT || code === ERROR_CODES.NETWORK,
    userMessage: fallbackMessages[code] || fallbackMessages[ERROR_CODES.UNKNOWN],
    context,
    cause: error
  });
}

export function getFriendlyErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error) {
    return fallback;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error.userMessage) {
    return error.userMessage;
  }

  if (isOfflineError(error)) {
    return "You are offline. Please reconnect and try again.";
  }

  return error.message || fallback;
}
