import React, { useEffect, useState, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface DeviceListItem {
  id: string;
  name: string;
  is_online?: boolean;
  location_branch?: string | null;
}

interface DevicesLayoutProps {
  children: ReactNode;
}

const DevicesLayout: React.FC<DevicesLayoutProps> = ({ children }) => {
  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const currentIdMatch = location.pathname.match(/^\/devices\/([^/]+)/);
  const selectedId = currentIdMatch ? currentIdMatch[1] : null;

  async function loadDevices() {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("accessToken") || "";
      const res = await fetch("/api/devices/list-full", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(`Failed to load devices (${res.status})`);
      }

      const data = await res.json();
      setDevices(data.devices || data || []);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load devices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDevices();

    // Listen for device removal events to sync the explorer
    const handleDevicesChanged = () => {
      loadDevices();
    };
    window.addEventListener("devicesChanged", handleDevicesChanged);
    
    return () => {
      window.removeEventListener("devicesChanged", handleDevicesChanged);
    };
  }, []);

  return (
    <div className="flex h-full gap-6">
      {/* LEFT: Device Explorer */}
      <aside className="w-72 shrink-0 rounded-3xl bg-white/80 border border-slate-100 shadow-[0_18px_60px_rgba(15,23,42,0.06)] p-4 flex flex-col">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
            Device Explorer
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Select a device to control and monitor.
          </p>
        </div>

        <div className="flex items-center justify-between mb-3 text-[11px] text-slate-500">
          <span>
            Total:{" "}
            <span className="font-semibold text-slate-800">
              {devices.length}
            </span>
          </span>
          <button
            onClick={loadDevices}
            className="px-2 py-1 rounded-full border border-slate-200 text-[11px] hover:bg-slate-50 active:bg-slate-100 transition"
          >
            ↻ Refresh
          </button>
        </div>

        {loading && (
          <div className="text-xs text-slate-500 py-2">Loading devices…</div>
        )}
        {error && (
          <div className="text-xs text-rose-500 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 mb-2">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {devices.map((d) => {
            const isActive = d.id === selectedId;
            const online = !!d.is_online;

            return (
              <button
                key={d.id}
                onClick={() => navigate(`/devices/${d.id}`)}
                className={[
                  "w-full text-left px-3 py-2.5 rounded-2xl border flex flex-col gap-0.5 transition shadow-sm",
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow-[0_10px_35px_rgba(15,23,42,0.40)]"
                    : "border-slate-200 bg-slate-50/80 hover:bg-slate-100 hover:border-slate-300",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">
                    {d.name || "Unnamed device"}
                  </span>
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      online
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-600",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "inline-block w-1.5 h-1.5 rounded-full",
                        online ? "bg-emerald-500" : "bg-rose-500",
                      ].join(" ")}
                    />
                    {online ? "Online" : "Offline"}
                  </span>
                </div>
                {d.location_branch && (
                  <div className="text-[11px] text-slate-500 truncate">
                    {d.location_branch}
                  </div>
                )}
              </button>
            );
          })}

          {!loading && !devices.length && !error && (
            <div className="text-xs text-slate-500 py-4 text-center">
              No devices yet. Add a device from the{" "}
              <span className="font-medium text-slate-800">Devices</span> page.
            </div>
          )}
        </div>
      </aside>

      {/* RIGHT: Page content */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
};

export default DevicesLayout;
