const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  off: 99
};

const DEFAULT_LEVEL = "info";
const isDev = import.meta.env.DEV;

let activeLevel = String(import.meta.env.VITE_LOG_LEVEL || DEFAULT_LEVEL).toLowerCase();
if (!(activeLevel in LOG_LEVELS)) {
  activeLevel = DEFAULT_LEVEL;
}

function shouldLog(level) {
  return LOG_LEVELS[level] >= LOG_LEVELS[activeLevel] && activeLevel !== "off";
}

function safeMeta(meta) {
  if (!meta) {
    return undefined;
  }

  try {
    return JSON.parse(JSON.stringify(meta));
  } catch (_error) {
    return { note: "unserializable_meta" };
  }
}

function write(level, namespace, message, meta) {
  if (!shouldLog(level)) {
    return;
  }

  const stamp = new Date().toISOString();
  const prefix = `[${stamp}] [${level.toUpperCase()}] [${namespace}]`;
  const payload = safeMeta(meta);

  if (payload !== undefined) {
    console[level](`${prefix} ${message}`, payload);
  } else {
    console[level](`${prefix} ${message}`);
  }
}

export function setLogLevel(level) {
  const normalized = String(level || "").toLowerCase();
  if (normalized in LOG_LEVELS) {
    activeLevel = normalized;
  }
}

export function getLogLevel() {
  return activeLevel;
}

export function createLogger(namespace = "app") {
  return {
    debug(message, meta) {
      if (isDev) {
        write("debug", namespace, message, meta);
      }
    },
    info(message, meta) {
      write("info", namespace, message, meta);
    },
    warn(message, meta) {
      write("warn", namespace, message, meta);
    },
    error(message, meta) {
      write("error", namespace, message, meta);
    }
  };
}

export const logger = createLogger("app");
