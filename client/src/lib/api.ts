// client/src/lib/api.ts
// Central API client with automatic Authorization header handling.

let ROOT = (import.meta as any).env?.VITE_API_BASE_URL
  ? String((import.meta as any).env.VITE_API_BASE_URL).replace(/\/$/, "")
  : "";

// If someone sets .../api, strip it to avoid /api/api duplication.
ROOT = ROOT.replace(/\/api$/i, "");

// If ROOT is empty, we fall back to relative '/api' (works only if you proxy/rewrite in dev/prod).
export const API_BASE = ROOT ? `${ROOT}/api` : "/api";

/**
 * authorizedFetch
 * - Adds Authorization: Bearer <token> automatically
 * - Adds Content-Type: application/json when body is present and not FormData
 * - On 401: removes token and redirects to /login (enterprise behavior)
 */
export async function authorizedFetch(url: string, options: any = {}) {
  const token = localStorage.getItem("accessToken");

  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  // Only set JSON content-type automatically if body is a plain object/string.
  // If body is FormData, browser must set multipart boundary automatically.
  const body = options.body;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (body && !isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // Auto-logout on auth failure (and force user back to login)
  if (res.status === 401) {
    localStorage.removeItem("accessToken");

    // Avoid redirect loops if we're already on /login
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
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
export function apiFetch(path: string, options: any = {}) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return authorizedFetch(`${API_BASE}${cleanPath}`, options);
}

async function jsonOrThrow(res: Response, fallbackMsg: string) {
  const text = await res.text();
  let parsed: any = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // ignore non-json
  }

  if (!res.ok) {
    const msg = parsed?.error || parsed?.message || fallbackMsg;
    throw new Error(typeof msg === "string" ? msg : fallbackMsg);
  }

  return parsed;
}

/**
 * apiJson
 * Convenience helper when you want JSON response + automatic error handling.
 */
export async function apiJson(path: string, options: any = {}, fallbackMsg = "Request failed") {
  const res = await apiFetch(path, options);
  return jsonOrThrow(res, fallbackMsg);
}

export const api = {
  auth: {
    register: async (data: any) => {
      const res = await apiFetch(`/auth/register`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return jsonOrThrow(res, "Failed to register");
    },

    login: async (data: any) => {
      const res = await apiFetch(`/auth/login`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      const json = await jsonOrThrow(res, "Failed to login");

      // Save JWT after login
      if (json?.accessToken) {
        localStorage.setItem("accessToken", json.accessToken);
      }

      return json;
    },
  },

  dashboard: {
    summary: async () => {
      const res = await apiFetch(`/dashboard/summary`, { method: "GET" });
      return jsonOrThrow(res, "Failed to load dashboard summary");
    },
    liveContent: async () => {
      const res = await apiFetch(`/dashboard/live-content`, { method: "GET" });
      return jsonOrThrow(res, "Failed to load live content");
    },
  },

  commands: {
    active: async () => {
      const res = await apiFetch(`/commands/active`, { method: "GET" });
      return jsonOrThrow(res, "Failed to fetch active commands");
    },
  },

  screens: {
    getAll: async () => apiFetch(`/screens`, { method: "GET" }),
    getOne: async (id: string) => apiFetch(`/screens/${id}`, { method: "GET" }),
    create: async (data: any) =>
      apiFetch(`/screens`, { method: "POST", body: JSON.stringify(data) }),
    update: async (id: string, data: any) =>
      apiFetch(`/screens/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: async (id: string) => apiFetch(`/screens/${id}`, { method: "DELETE" }),
  },

  media: {
    getAll: async () => apiFetch(`/media`, { method: "GET" }),
    create: async (data: any) =>
      apiFetch(`/media`, { method: "POST", body: JSON.stringify(data) }),
    delete: async (id: string) => apiFetch(`/media/${id}`, { method: "DELETE" }),
  },

  devices: {
    list: async () => apiFetch(`/devices/list`, { method: "GET" }),
    listFull: async () => apiFetch(`/devices/list-full`, { method: "GET" }),
    details: async (id: string) =>
      apiFetch(`/devices/${id}/details`, { method: "GET" }),
    locationList: async () => apiFetch(`/devices/locations`, { method: "GET" }),
    // Admin-only command endpoint (JWT required)
    command: async (deviceId: string, data: any) =>
      apiFetch(`/admin/devices/${deviceId}/command`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  admin: {
    users: {
      list: async () => {
        const res = await apiFetch(`/admin/users`, { method: "GET" });
        return jsonOrThrow(res, "Failed to list users");
      },
      create: async (data: { email: string; password: string; role?: string; name?: string }) => {
        const res = await apiFetch(`/admin/users`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        return jsonOrThrow(res, "Failed to create user");
      },
    },
    screens: {
      rotateToken: async (id: number) => {
        const res = await apiFetch(`/admin/screens/${id}/rotate-token`, { method: "POST" });
        return jsonOrThrow(res, "Failed to rotate device token");
      },
    },
  },
};
