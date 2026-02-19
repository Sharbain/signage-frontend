// client/src/lib/api.ts
// Central API client with automatic Authorization header handling.

// Configure API base via Vite env.
// - In production (recommended): set VITE_API_BASE_URL=https://your-backend-domain.com
// - In dev with proxy: leave unset to use relative /api
// Configure API base via Vite env.
// You can set VITE_API_BASE_URL to either:
// - https://your-backend-domain.com
// - https://your-backend-domain.com/api
// We'll normalize it safely.
let ROOT = (import.meta as any).env?.VITE_API_BASE_URL
  ? String((import.meta as any).env.VITE_API_BASE_URL).replace(/\/$/, "")
  : "";

// If someone sets .../api, strip it to avoid /api/api duplication.
ROOT = ROOT.replace(/\/api$/i, "");

// If ROOT is empty, we fall back to relative '/api' (works only if you proxy/rewite in dev/prod).
export const API_BASE = ROOT ? `${ROOT}/api` : "/api";

// Helper to automatically attach JWT
export async function authorizedFetch(url: string, options: any = {}) {
  const token = localStorage.getItem("accessToken");

  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // Auto-logout on auth failure
  if (res.status === 401) {
    localStorage.removeItem("accessToken");
  }

  return res;
}

async function jsonOrThrow(res: Response, fallbackMsg: string) {
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!res.ok) {
    const msg = parsed?.error || parsed?.message || fallbackMsg;
    throw new Error(typeof msg === "string" ? msg : fallbackMsg);
  }
  return parsed;
}

export const api = {
  auth: {
    register: async (data: any) => {
      const res = await authorizedFetch(`${API_BASE}/auth/register`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return jsonOrThrow(res, "Failed to register");
    },

    login: async (data: any) => {
      const res = await authorizedFetch(`${API_BASE}/auth/login`, {
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
      const res = await authorizedFetch(`${API_BASE}/dashboard/summary`, { method: "GET" });
      return jsonOrThrow(res, "Failed to load dashboard summary");
    },
    liveContent: async () => {
      const res = await authorizedFetch(`${API_BASE}/dashboard/live-content`, { method: "GET" });
      return jsonOrThrow(res, "Failed to load live content");
    },
  },

  commands: {
    active: async () => {
      const res = await authorizedFetch(`${API_BASE}/commands/active`, { method: "GET" });
      return jsonOrThrow(res, "Failed to fetch active commands");
    },
  },

  screens: {
    getAll: async () => authorizedFetch(`${API_BASE}/screens`, { method: "GET" }),
    getOne: async (id: string) => authorizedFetch(`${API_BASE}/screens/${id}`, { method: "GET" }),
    create: async (data: any) =>
      authorizedFetch(`${API_BASE}/screens`, { method: "POST", body: JSON.stringify(data) }),
    update: async (id: string, data: any) =>
      authorizedFetch(`${API_BASE}/screens/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: async (id: string) => authorizedFetch(`${API_BASE}/screens/${id}`, { method: "DELETE" }),
  },

  media: {
    getAll: async () => authorizedFetch(`${API_BASE}/media`, { method: "GET" }),
    create: async (data: any) =>
      authorizedFetch(`${API_BASE}/media`, { method: "POST", body: JSON.stringify(data) }),
    delete: async (id: string) => authorizedFetch(`${API_BASE}/media/${id}`, { method: "DELETE" }),
  },

  devices: {
    list: async () => authorizedFetch(`${API_BASE}/devices/list`, { method: "GET" }),
    listFull: async () => authorizedFetch(`${API_BASE}/devices/list-full`, { method: "GET" }),
    details: async (id: string) =>
      authorizedFetch(`${API_BASE}/devices/${id}/details`, { method: "GET" }),
    locationList: async () => authorizedFetch(`${API_BASE}/devices/locations`, { method: "GET" }),
    command: async (deviceId: string, data: any) =>
      authorizedFetch(`${API_BASE}/device/${deviceId}/command`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  admin: {
    users: {
      list: async () => {
        const res = await authorizedFetch(`${API_BASE}/admin/users`, { method: "GET" });
        return jsonOrThrow(res, "Failed to list users");
      },
      create: async (data: { email: string; password: string; role?: string; name?: string }) => {
        const res = await authorizedFetch(`${API_BASE}/admin/users`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        return jsonOrThrow(res, "Failed to create user");
      },
    },
    screens: {
      rotateToken: async (id: number) => {
        const res = await authorizedFetch(`${API_BASE}/admin/screens/${id}/rotate-token`, { method: "POST" });
        return jsonOrThrow(res, "Failed to rotate device token");
      },
    },
  },
};
