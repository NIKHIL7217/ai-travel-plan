import { AppError, ERROR_CODES, normalizeError } from "../errors";
import { createLogger } from "../logger";
import { trackApiAttempt, trackApiFailure, trackApiSuccess } from "./index";

const requestLogger = createLogger("http");

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  return { controller, timeoutId };
}

function getDurationMs(startedAt) {
  return Date.now() - startedAt;
}

function sanitizeUrl(url) {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";

  try {
    const parsed = new URL(url, origin);
    ["key", "api_key", "token"].forEach((field) => {
      if (parsed.searchParams.has(field)) {
        parsed.searchParams.set(field, "***");
      }
    });
    return parsed.toString();
  } catch (_error) {
    return String(url);
  }
}

export async function requestWithRetry(url, init = {}, options = {}) {
  const {
    operation = "http.request",
    timeoutMs = 12000,
    retries = 1,
    retryDelayMs = 500,
    retryOnStatuses = RETRYABLE_STATUS
  } = options;

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new AppError("Offline", {
      code: ERROR_CODES.OFFLINE,
      retryable: true,
      userMessage: "You are offline. Reconnect and try again.",
      context: { operation, url: sanitizeUrl(url) }
    });
  }

  const method = String(init.method || "GET").toUpperCase();

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const startedAt = Date.now();
    const attemptNumber = attempt + 1;
    const { controller, timeoutId } = withTimeout(timeoutMs);

    trackApiAttempt({
      operation,
      method,
      url: sanitizeUrl(url),
      attempt: attemptNumber
    });

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal
      });

      const durationMs = getDurationMs(startedAt);

      if (!response.ok) {
        const isRetryable = retryOnStatuses.has(response.status);
        const responseError = new AppError(`HTTP ${response.status}`, {
          code: ERROR_CODES.API,
          status: response.status,
          retryable: isRetryable,
          userMessage: "Could not load data right now. Please retry.",
          context: {
            operation,
            method,
            attempt: attemptNumber,
            durationMs,
            url: sanitizeUrl(url)
          }
        });

        trackApiFailure({
          operation,
          method,
          url: sanitizeUrl(url),
          status: response.status,
          attempt: attemptNumber,
          durationMs
        });

        if (isRetryable && attempt < retries) {
          await delay(retryDelayMs * attemptNumber);
          continue;
        }

        throw responseError;
      }

      trackApiSuccess({
        operation,
        method,
        url: sanitizeUrl(url),
        status: response.status,
        attempt: attemptNumber,
        durationMs
      });

      return response;
    } catch (error) {
      const durationMs = getDurationMs(startedAt);
      let normalized = normalizeError(error, {
        operation,
        method,
        url: sanitizeUrl(url),
        attempt: attemptNumber,
        durationMs
      });

      if (error?.name === "AbortError") {
        normalized = new AppError("Request timeout", {
          code: ERROR_CODES.TIMEOUT,
          retryable: true,
          userMessage: "Request took too long. Please try again.",
          context: {
            operation,
            method,
            url: sanitizeUrl(url),
            attempt: attemptNumber,
            durationMs
          },
          cause: error
        });
      }

      requestLogger.warn("Request failed", {
        operation,
        method,
        attempt: attemptNumber,
        durationMs,
        code: normalized.code,
        status: normalized.status
      });

      trackApiFailure({
        operation,
        method,
        url: sanitizeUrl(url),
        code: normalized.code,
        status: normalized.status,
        attempt: attemptNumber,
        durationMs
      });

      if (normalized.retryable && attempt < retries) {
        await delay(retryDelayMs * attemptNumber);
        continue;
      }

      throw normalized;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new AppError("Failed after retries", {
    code: ERROR_CODES.API,
    retryable: false,
    userMessage: "Unable to complete request. Please try again shortly.",
    context: { operation, method, url: sanitizeUrl(url) }
  });
}

export async function requestJson(url, init = {}, options = {}) {
  const response = await requestWithRetry(url, init, options);
  return response.json();
}
