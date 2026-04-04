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
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
}
