// Bound both the request and response-body read so a stalled connection can be retried.
export async function requestReviewJson(url: string, init: RequestInit = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return { ok: response.ok, status: response.status, body: response.ok ? await response.json() : null };
  } finally {
    clearTimeout(timeout);
  }
}
