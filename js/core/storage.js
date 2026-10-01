const memoryFallback = new Map();

function hasLocalStorage() {
  try {
    const probe = "__studyroom_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

const storageEnabled = typeof window !== "undefined" && hasLocalStorage();

function bucket() {
  return storageEnabled ? window.localStorage : memoryFallback;
}

export function readJSON(key, fallback) {
  try {
    const raw = bucket().getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    bucket().setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
