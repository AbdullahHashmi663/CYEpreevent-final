// Retry-After may be a delay in seconds or an HTTP date. Never retry a POST automatically.
export function registrationRetrySeconds(value: string | null, now = Date.now(), fallback = 60) {
  if (!value) return fallback;
  const seconds = /^\d+$/.test(value.trim()) ? Number(value) : Math.ceil((Date.parse(value) - now) / 1000);
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(3600, Math.ceil(seconds)) : fallback;
}
