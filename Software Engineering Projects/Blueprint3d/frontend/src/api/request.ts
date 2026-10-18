export async function apiFetch(url: string, options: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(url, { ...options, signal: options.signal ?? AbortSignal.timeout(15000) });
  }
  catch {
    throw new Error('Could not reach the server. Start the backend and check your server-mode settings.');
  }
  if (!response.ok && response.status !== 404) {
    const body = await response.json().catch(() => null) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? `Server request failed (${response.status}).`);
  }
  return response;
}
