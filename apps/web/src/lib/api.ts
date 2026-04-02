// src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function fetchWithAuth(
  path: string,
  token: string,
  options?: RequestInit,
) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
}
