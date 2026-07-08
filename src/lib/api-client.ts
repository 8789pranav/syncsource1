/**
 * Centralized API client — redirects all /api/* calls to the Python backend
 * with JWT Bearer token authentication.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("access_token", token);
    // Also set cookie for SSR middleware
    document.cookie = `access_token=${token}; path=/; max-age=86400; samesite=lax`;
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    document.cookie = "access_token=; path=/; max-age=0";
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * Drop-in replacement for fetch() that:
 * 1. Rewrites /api/* paths to the Python backend URL
 * 2. Attaches JWT Bearer token from localStorage
 * 3. Returns the same Response interface
 */
export async function apiFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  let url: string;

  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else {
    url = input.url;
  }

  // Rewrite /api/* paths to the Python backend
  if (url.startsWith("/api/")) {
    url = `${API_BASE_URL}${url}`;
  }

  // Merge headers with auth token
  const headers = new Headers(init?.headers);
  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Handle 401 — clear token and redirect to login
  const response = await fetch(url, { ...init, headers });

  if (response.status === 401 && typeof window !== "undefined") {
    clearToken();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }

  return response;
}
