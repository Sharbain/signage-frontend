// client/src/lib/api.ts
// Central API client with automatic Authorization header handling.
// Updated: better error messages (includes HTTP status + backend {error|message})
//          preserves raw text for debugging, detects HTML responses.
//
// GOD MODE CHANGE:
// - DO NOT auto-logout on 401/403 inside fetch.
//   Auto-logout here is too aggressive and causes "glimpse then logout".
//   Instead, return the response and let the UI show the error.
//   (RequireAuth already protects routes when token is missing.)

type FetchOptions = RequestInit & {
  timeoutMs?: number;
};

function getEnvApiRoot(): string {
  const raw =
    (import.meta as any).env?.VITE_API_BASE_URL != null
      ? String((import.meta as any).env.VITE_API_BASE_URL)
      : "";

  let root = raw.trim().replace(/\/+$/, "");
  root = root.replace(/\/api$/i, "");
  return root;
}

const ROOT = getEnvApiRoot();
export const API_BASE = ROOT ? `${ROOT}/api` : "/api";

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

function looksLikeHtml(text: string) {
  const t = text.trim();
  return t.startsWith("<!doctype") || t.startsWith("<html") || t.startsWith("<");
}

function extractApiErrorMessage(text: string, fallbackMsg: string) {
  try {
    const parsed = text ? JSON.parse(text) : null;
    const msg = parsed?.error || parsed?.message;
    if (typeof msg === "string" && msg.trim()) return msg;
  } catch {
    // ignore
  }

  const trimmed = (text || "").trim();
  if (trimmed && trimmed.length <= 300 && !looksLikeHtml(trimmed)) return trimmed;

  return fallbackMsg;
}

/**
 * authorizedFetch
 * - Adds Authorization: Bearer <token> automatically
 * - Adds Content-Type: application/json when body is present and not FormData
 * - Always sets Accept: application/json
 *
 * GOD MODE:
 * - No auto logout here. Ever.
 *   If an endpoint returns 401/403, we let apiText/apiJson throw
 *   and the page will show the error instead of nuking the session.
 */
export async function authorizedFetch(url: string, options: FetchOptions = {}) {
  const token = localStorage.getItem("accessToken");

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as any),
  };

  const body = (options as any).body;
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
    if (err?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  }

  // ✅ Do NOT clear token / redirect.
  // Just log for debugging.
  if (res.status === 401 || res.status === 403) {
    try {
      // eslint-disable-next-line no-console
      console.warn(`[AUTH] ${res.status} from ${url} (no auto-logout)`);
    } catch {
      // ignore
    }
  }

  return res;
}

export function apiFetch(path: string, options: FetchOptions = {}) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return authorizedFetch(`${API_BASE}${cleanPath}`, options);
}

export async function apiText(
  path: string,
  options: FetchOptions = {},
  fallbackMsg = "Request failed",
) {
  const res = await apiFetch(path, options);
  const text = await res.text().catch(() => "");

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
        { method: "POST", body: JSON.stringify(data) },
        "Failed to register",
      ),

    login: async (data: any) => {
      const json = await apiJson<{ accessToken?: string }>(
        `/auth/login`,
        { method: "POST", body: JSON.stringify(data) },
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
      apiJson(`/screens`, { method: "POST", body: JSON.stringify(data) }, "Failed to create screen"),
    update: async (id: string, data: any) =>
      apiJson(`/screens/${id}`, { method: "PUT", body: JSON.stringify(data) }, "Failed to update screen"),
    delete: async (id: string) =>
      apiJson(`/screens/${id}`, { method: "DELETE" }, "Failed to delete screen"),
  },

  media: {
    getAll: async () => apiJson(`/media`, { method: "GET" }, "Failed to load media"),
    create: async (data: any) =>
      apiJson(`/media`, { method: "POST", body: JSON.stringify(data) }, "Failed to create media"),
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
      list: async () => apiJson(`/admin/users`, { method: "GET" }, "Failed to list users"),
      create: async (data: { email: string; password: string; role?: string; name?: string }) =>
        apiJson(`/admin/users`, { method: "POST", body: JSON.stringify(data) }, "Failed to create user"),
    },
    screens: {
      rotateToken: async (id: number) =>
        apiJson(`/admin/screens/${id}/rotate-token`, { method: "POST" }, "Failed to rotate device token"),
    },
  },
};
