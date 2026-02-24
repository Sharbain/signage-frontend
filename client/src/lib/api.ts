// client/src/lib/api.ts
// Central API client with automatic Authorization header handling.
// Updated: better error messages (includes HTTP status + backend {error|message})
//          preserves raw text for debugging, detects HTML responses.
// Enterprise update: only auto-logout on definite auth failure (401/403),
//                    never on server errors (500/502/etc).

type FetchOptions = RequestInit & {
  timeoutMs?: number;
};

function getEnvApiRoot(): string {
  // Vite env: VITE_API_BASE_URL can be:
  // - https://your-backend.com
  // - https://your-backend.com/api
  // - (empty) => fallback to "/api" (requires proxy/rewrite)
  const raw =
    (import.meta as any).env?.VITE_API_BASE_URL != null
      ? String((import.meta as any).env.VITE_API_BASE_URL)
      : "";

  let root = raw.trim().replace(/\/+$/, ""); // strip trailing slashes

  // If someone sets .../api, strip it so we don't end up with /api/api
  root = root.replace(/\/api$/i, "");

  return root;
}

const ROOT = getEnvApiRoot();

// If ROOT is empty, we fall back to relative '/api' (works only if you proxy/rewrite in dev/prod).
export const API_BASE = ROOT ? `${ROOT}/api` : "/api";

/**
 * Internal: fetch with timeout support
 */
async function fetchWithTimeout(url: string, options: FetchOptions = {}) {
  const { timeoutMs = 30000, ...rest } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Helpers
 */
function looksLikeHtml(text: string) {
  const t = text.trim();
  return t.startsWith("<!doctype") || t.startsWith("<html") || t.startsWith("<");
}

function extractApiErrorMessage(text: string, fallbackMsg: string) {
  // Try to parse JSON error shape: { error } or { message }
  try {
    const parsed = text ? JSON.parse(text) : null;
    const msg = parsed?.error || parsed?.message;
    if (typeof msg === "string" && msg.trim()) return msg;
  } catch {
    // ignore
  }

  // If not JSON, use text if it's short and readable
  const trimmed = (text || "").trim();
  if (trimmed && trimmed.length <= 300 && !looksLikeHtml(trimmed)) return trimmed;

  return fallbackMsg;
}

/**
 * authorizedFetch
 * - Adds Authorization: Bearer <token> automatically
 * - Adds Content-Type: application/json when body is present and not FormData
 * - Always sets Accept: application/json
 * - On 401/403: removes token and redirects to /login (ONLY if token existed)
 */
export async function authorizedFetch(url: string, options: FetchOptions = {}) {
  const token = localStorage.getItem("accessToken");

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as any),
  };

  const body = (options as any).body;

  // Only set JSON content-type automatically if body is not FormData
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (body && !isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetchWithTimeout(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    // AbortController errors should show nicely
    if (err?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  }

  // ✅ Enterprise auth handling:
  // - Only logout on definitive auth failure (401/403)
  // - Only if we actually had a token (prevents weird redirects on public pages)
  // - Never logout on 500/502/etc (server instability should not kill session)
  if (res.status === 401 || res.status === 403) {
    const hadToken = !!token;

    // Helpful debug line (you can remove later)
    try {
      // eslint-disable-next-line no-console
      console.warn(`[AUTH] ${res.status} from ${url} (hadToken=${hadToken})`);
    } catch {
      // ignore
    }

    if (hadToken) {
      localStorage.removeItem("accessToken");

      // Avoid redirect loops if we're already on /login
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
  }

  return res;
}

/**
 * apiFetch
 * Use this everywhere instead of fetch("/api/...")
 *
 * Example:
 *   const res = await apiFetch("/media");
 *   const res = await apiFetch("/devices/list-full");
 */
export function apiFetch(path: string, options: FetchOptions = {}) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return authorizedFetch(`${API_BASE}${cleanPath}`, options);
}

/**
 * apiText
 * - Returns raw text
 * - Throws helpful error if non-OK (includes backend error message and HTTP status)
 * - Detects HTML (usually means wrong endpoint or rewrite issues)
 */
export async function apiText(
  path: string,
  options: FetchOptions = {},
  fallbackMsg = "Request failed",
) {
  const res = await apiFetch(path, options);

  const text = await res.text().catch(() => "");

  // Defensive: HTML ≠ JSON (often indicates your frontend got served instead of API)
  if (!res.ok && looksLikeHtml(text)) {
    throw new Error(
      "Server returned HTML instead of JSON. Check VITE_API_BASE_URL and Vercel rewrites/proxy.",
    );
  }

  if (!res.ok) {
    const msg = extractApiErrorMessage(text, fallbackMsg);
    throw new Error(`${msg} (HTTP ${res.status})`);
  }

  return text;
}

/**
 * apiJson
 * Convenience helper when you want JSON response + automatic error handling.
 */
export async function apiJson<T = any>(
  path: string,
  options: FetchOptions = {},
  fallbackMsg = "Request failed",
): Promise<T> {
  const text = await apiText(path, options, fallbackMsg);

  if (!text) return null as any;

  try {
    return JSON.parse(text) as T;
  } catch {
    // Include a tiny snippet to help debugging if backend accidentally returns plain text
    const snippet = text.trim().slice(0, 140);
    throw new Error(
      `Server returned non-JSON response${snippet ? `: "${snippet}"` : ""}`,
    );
  }
}

export const api = {
  auth: {
    register: async (data: any) =>
      apiJson(
        `/auth/register`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
        "Failed to register",
      ),

    login: async (data: any) => {
      const json = await apiJson<{ accessToken?: string }>(
        `/auth/login`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
        "Failed to login",
      );

      if (json?.accessToken) {
        localStorage.setItem("accessToken", json.accessToken);
      }

      return json;
    },
  },

  dashboard: {
    summary: async () =>
      apiJson(`/dashboard/summary`, { method: "GET" }, "Failed to load dashboard summary"),
    liveContent: async () =>
      apiJson(`/dashboard/live-content`, { method: "GET" }, "Failed to load live content"),
  },

  commands: {
    active: async () =>
      apiJson(`/commands/active`, { method: "GET" }, "Failed to fetch active commands"),
  },

  screens: {
    getAll: async () => apiJson(`/screens`, { method: "GET" }, "Failed to load screens"),
    getOne: async (id: string) =>
      apiJson(`/screens/${id}`, { method: "GET" }, "Failed to load screen"),
    create: async (data: any) =>
      apiJson(
        `/screens`,
        { method: "POST", body: JSON.stringify(data) },
        "Failed to create screen",
      ),
    update: async (id: string, data: any) =>
      apiJson(
        `/screens/${id}`,
        { method: "PUT", body: JSON.stringify(data) },
        "Failed to update screen",
      ),
    delete: async (id: string) =>
      apiJson(`/screens/${id}`, { method: "DELETE" }, "Failed to delete screen"),
  },

  media: {
    getAll: async () => apiJson(`/media`, { method: "GET" }, "Failed to load media"),
    create: async (data: any) =>
      apiJson(
        `/media`,
        { method: "POST", body: JSON.stringify(data) },
        "Failed to create media",
      ),
    delete: async (id: string) =>
      apiJson(`/media/${id}`, { method: "DELETE" }, "Failed to delete media"),
  },

  devices: {
    list: async () => apiJson(`/devices/list`, { method: "GET" }, "Failed to load devices"),
    listFull: async () =>
      apiJson(`/devices/list-full`, { method: "GET" }, "Failed to load devices"),
    details: async (id: string) =>
      apiJson(`/devices/${id}/details`, { method: "GET" }, "Failed to load device details"),
    locationList: async () =>
      apiJson(`/devices/locations`, { method: "GET" }, "Failed to load locations"),
    command: async (deviceId: string, data: any) =>
      apiJson(
        `/admin/devices/${deviceId}/command`,
        { method: "POST", body: JSON.stringify(data) },
        "Failed to send device command",
      ),
  },

  admin: {
    users: {
      list: async () =>
        apiJson(`/admin/users`, { method: "GET" }, "Failed to list users"),
      create: async (data: { email: string; password: string; role?: string; name?: string }) =>
        apiJson(
          `/admin/users`,
          { method: "POST", body: JSON.stringify(data) },
          "Failed to create user",
        ),
    },
    screens: {
      rotateToken: async (id: number) =>
        apiJson(
          `/admin/screens/${id}/rotate-token`,
          { method: "POST" },
          "Failed to rotate device token",
        ),
    },
  },
};
