import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

type DeviceFull = {
  id: string;
  name: string;
  location_branch?: string;
  is_online: boolean;
  last_seen: string | null;
  status: string;
  current_content_id?: string | null;
  temperature?: number | null;
  free_storage?: number | null;
  battery_level?: number | null;
  signal_strength?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  errors: string[];
  last_status_at: string | null;
};

function safeErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong";
}

export default function Devices() {
  const [devices, setDevices] = useState<DeviceFull[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());

  const navigate = useNavigate();

  const toggleDeviceSelection = (deviceId: string) => {
    setSelectedDevices((prev) => {
      const next = new Set(prev);
      if (next.has(deviceId)) next.delete(deviceId);
      else next.add(deviceId);
      return next;
    });
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await apiFetch("/devices/list-full", { method: "GET" });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to load devices (${res.status}) — ${text.slice(0, 120)}`);
      }

      // apiFetch should always return JSON, but keep this defensive parsing
      const text = await res.text();

      if (text.trim().startsWith("<")) {
        throw new Error("Server returned HTML instead of JSON (wrong route or missing API_BASE)");
      }

      const data = JSON.parse(text);
      setDevices(Array.isArray(data?.devices) ? data.devices : []);
    } catch (e) {
      console.error("Devices load error:", e);
      setDevices([]);
      setError(safeErrorMessage(e) || "Failed to load devices");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevices = async () => {
    if (selectedDevices.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove ${selectedDevices.size} device(s)?`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const deviceIds = Array.from(selectedDevices);

      // Delete in parallel, but don't crash if one fails
      const results = await Promise.allSettled(
        deviceIds.map((id) => apiFetch(`/screens/${id}`, { method: "DELETE" }))
      );

      const failed = results
        .map((r, idx) => ({ r, id: deviceIds[idx] }))
        .filter(({ r }) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));

      if (failed.length > 0) {
        // Try to extract one meaningful error
        let firstErr = "Some devices failed to remove.";
        const first = failed[0]?.r;
        if (first && first.status === "fulfilled") {
          const txt = await first.value.text().catch(() => "");
          firstErr = `Failed to remove ${failed.length} device(s). ${txt.slice(0, 120)}`;
        }
        setError(firstErr);
      }

      // Optimistically update UI for successful deletions
      const successIds = deviceIds.filter((_, idx) => {
        const r = results[idx];
        return r.status === "fulfilled" && r.value.ok;
      });

      if (successIds.length > 0) {
        setDevices((prev) => prev.filter((d) => !successIds.includes(d.id)));
      }

      setSelectedDevices(new Set());

      // Notify Device Explorer (or any listener) to refresh
      window.dispatchEvent(new CustomEvent("devicesChanged"));
    } catch (err) {
      console.error("Failed to remove devices:", err);
      setError(safeErrorMessage(err) || "Failed to remove devices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return devices;
    return devices.filter((d) => {
      const hay = `${d.name} ${d.id} ${d.location_branch ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [devices, search]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4 text-[#3d3d3d]">Devices</h1>

      <div className="flex items-center gap-3 mb-4">
        <input
          className="p-2 border border-[#e0ddd5] rounded w-80 bg-white text-[#3d3d3d] focus:outline-none focus:border-[#5b7a5b]"
          placeholder="Search devices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="input-search-devices"
        />

        <button
          className="bg-[#5b7a5b] text-white px-4 py-2 rounded shadow hover:bg-[#4a6349] transition"
          onClick={() => navigate("/devices/add")}
          data-testid="button-add-device"
        >
          + Add Device
        </button>

        <button
          onClick={handleRemoveDevices}
          disabled={selectedDevices.size === 0 || loading}
          className={`flex items-center gap-2 px-4 py-2 rounded shadow transition ${
            selectedDevices.size > 0 && !loading
              ? "bg-[#c9534a] text-white hover:bg-[#b5443c]"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
          data-testid="button-remove-device"
        >
          <Trash2 className="w-4 h-4" />
          Remove {selectedDevices.size > 0 ? `(${selectedDevices.size})` : ""}
        </button>
      </div>

      {loading && <div className="text-[#6b6b6b]">Loading devices…</div>}

      {error && !loading && <div className="text-sm text-[#c9534a] mb-3">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-[#6b6b6b]">No devices found. Add your first device.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((d) => (
          <div
            key={d.id}
            className={`bg-white p-4 rounded-xl shadow border cursor-pointer hover:shadow-lg transition ${
              selectedDevices.has(d.id)
                ? "border-[#5b7a5b] ring-2 ring-[#5b7a5b]/20"
                : "border-[#e0ddd5]"
            }`}
            onClick={() => navigate(`/devices/${d.id}`)}
            data-testid={`card-device-${d.id}`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedDevices.has(d.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleDeviceSelection(d.id)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-[#5b7a5b] focus:ring-[#5b7a5b]"
                data-testid={`checkbox-device-${d.id}`}
              />
              <div className="font-semibold text-[#3d3d3d]">{d.name}</div>
            </div>

            <div className="text-xs text-[#6b6b6b]">Location: {d.location_branch || "Unknown"}</div>

            <div className="mt-2 text-sm">
              <span className={d.is_online ? "text-[#5b7a5b]" : "text-[#b5836d]"}>
                ● {d.is_online ? "Online" : "Offline"}
              </span>
            </div>

            <div className="text-xs text-[#6b6b6b] mt-1">Status: {d.status}</div>

            <div className="text-xs text-[#6b6b6b]">Content: {d.current_content_id || "—"}</div>

            <div className="text-xs text-[#6b6b6b]">Signal: {d.signal_strength ?? "—"} dBm</div>

            <div className="text-xs text-[#6b6b6b]">
              Free Storage:{" "}
              {d.free_storage ? (d.free_storage / 1024 / 1024).toFixed(1) + " MB" : "—"}
            </div>

            {d.errors?.length > 0 && (
              <div className="text-xs text-[#c9534a] mt-2">Errors: {d.errors.join(", ")}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
