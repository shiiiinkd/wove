// src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is not set. Please define it in your environment variables.",
  );
}

export async function fetchWithAuth(
  path: string,
  token: string,
  options?: RequestInit,
) {
  const headers = new Headers(options?.headers as HeadersInit | undefined);

  headers.set("Authorization", `Bearer ${token}`);

  if (options?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
}
