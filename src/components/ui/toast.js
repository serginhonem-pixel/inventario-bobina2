let counter = 0;
const listeners = new Set();

export const toast = (message, options = {}) => {
  const payload = typeof message === "string" ? { message, ...options } : { ...message };
  const next = {
    id: payload.id || `toast_${Date.now()}_${counter++}`,
    message: payload.message || "",
    type: payload.type || "info",
    duration: payload.duration ?? 4000
  };

  listeners.forEach((listener) => listener(next));
  return next.id;
};

export const subscribeToasts = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
