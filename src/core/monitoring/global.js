import { normalizeError } from "../errors";
import { createLogger } from "../logger";
import { trackError } from "./index";

const globalLogger = createLogger("global-errors");
let installed = false;

export function installGlobalErrorHandlers(app) {
  if (installed) {
    return;
  }

  installed = true;

  const appLevelHandler = app?.config?.errorHandler;

  if (app?.config) {
    app.config.errorHandler = (error, instance, info) => {
      const normalized = normalizeError(error, {
        info,
        component: instance?.type?.name || "anonymous"
      });

      trackError(normalized, { source: "vue.config.errorHandler", info });
      globalLogger.error("Vue runtime error", {
        info,
        component: instance?.type?.name || "anonymous",
        code: normalized.code,
        message: normalized.message
      });

      if (typeof appLevelHandler === "function") {
        appLevelHandler(error, instance, info);
      }
    };
  }

  if (typeof window !== "undefined") {
    window.addEventListener("error", (event) => {
      const normalized = normalizeError(event.error || new Error(event.message), {
        source: "window.error",
        filename: event.filename,
        line: event.lineno,
        column: event.colno
      });

      trackError(normalized, { source: "window.error" });
      globalLogger.error("Unhandled window error", {
        message: normalized.message,
        code: normalized.code,
        filename: event.filename,
        line: event.lineno,
        column: event.colno
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason || "Unhandled rejection"));
      const normalized = normalizeError(reason, { source: "window.unhandledrejection" });

      trackError(normalized, { source: "window.unhandledrejection" });
      globalLogger.error("Unhandled promise rejection", {
        message: normalized.message,
        code: normalized.code
      });
    });
  }
}
