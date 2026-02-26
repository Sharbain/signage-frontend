// client/src/pages/DeviceControlPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiJson, api, API_ROOT } from "@/lib/api";
import { BrightnessControl } from "@/components/BrightnessControl";
import { VolumeControl } from "@/components/VolumeControl";
import {
  ArrowLeft,
  Power,
  RefreshCw,
  VolumeX,
  Volume2,
  MonitorOff,
  MonitorUp,
  RotateCcw,
  Camera,
} from "lucide-react";

type DeviceDetails = {
  id: string;
  name: string;
  status?: string;
  templateName?: string;
  signalStrength?: number;
  connectionType?: string;
  freeStorage?: number;
  lastOffline?: string;
  lastScreenshot?: string | null;
};

type CommandHistoryRow = {
  id: string;
  payload: any; // jsonb in DB
  sent: boolean;
  executed: boolean;
  executed_at: string | null;
  created_at: string;
};

function safeErr(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Something went wrong";
}

function fmtTime(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function withCacheBuster(url: string) {
  const t = Date.now();
  return url.includes("?") ? `${url}&t=${t}` : `${url}?t=${t}`;
}

export default function DeviceControlPage() {
  const { id } = useParams();
  const deviceId = id as string;

  const navigate = useNavigate();

  const [device, setDevice] = useState<DeviceDetails | null>(null);
  const [history, setHistory] = useState<CommandHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [screenshotBusy, setScreenshotBusy] = useState(false);

  const isOnline = useMemo(() => {
    const s = (device?.status || "").toLowerCase();
    // your backend sometimes returns "Online" / "Offline" in details
    return s.includes("online") || s === "online";
  }, [device?.status]);

  async function fetchLatestScreenshotUrl(): Promise<string | null> {
    const snap = await apiJson<{ file: string | null }>(
      `/admin/devices/${deviceId}/last-screenshot`,
      { method: "GET" },
      "Failed to load screenshot"
    );

    const file = snap?.file || null;
    if (!file) return null;

    const base = API_ROOT || window.location.origin;
    const absolute = file.startsWith("http") ? file : `${base}${file}`;
    // IMPORTANT: bust browser cache so the newest screenshot appears immediately
    return withCacheBuster(absolute);
  }

  async function loadAll() {
    try {
      setLoading(true);
      setError(null);

      const details = await api.devices.details(deviceId);

      // Latest screenshot is admin-only (do NOT call /api/device/* from CMS)
      try {
        const shotUrl = await fetchLatestScreenshotUrl();
        (details as any).lastScreenshot = shotUrl;
      } catch {
        // If screenshot fetch fails, don't break device explorer
        (details as any).lastScreenshot = null;
      }

      setDevice(details);

      // command history is admin-protected, uses JWT
      setLoadingHistory(true);
      const h = await apiJson<CommandHistoryRow[]>(
        `/admin/devices/${deviceId}/commands/history`,
        { method: "GET" },
        "Failed to load command history"
      );
      setHistory(Array.isArray(h) ? h : []);
    } catch (e) {
      console.error(e);
      setError(safeErr(e));
      setDevice(null);
      setHistory([]);
    } finally {
      setLoading(false);
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    if (!deviceId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  async function refreshHistoryOnly() {
    const h = await apiJson<CommandHistoryRow[]>(
      `/admin/devices/${deviceId}/commands/history`,
      { method: "GET" },
      "Failed to load command history"
    );
    setHistory(Array.isArray(h) ? h : []);
  }

  async function send(type: any, value?: number) {
    try {
      await api.devices.command(deviceId, value !== undefined ? { type, value } : { type });
      await refreshHistoryOnly();
    } catch (e) {
      console.error(e);
      alert(safeErr(e));
    }
  }

  async function handleScreenshotClick() {
    if (screenshotBusy) return;

    const prev = device?.lastScreenshot ?? null;
    setScreenshotBusy(true);

    try {
      // 1) Send command
      await api.devices.command(deviceId, { type: "SCREENSHOT" });
      await refreshHistoryOnly();

      // 2) Poll for a new screenshot URL for a short time
      // (device needs time to capture + upload)
      const deadline = Date.now() + 20_000; // 20s
      let nextUrl: string | null = null;

      while (Date.now() < deadline) {
        try {
          nextUrl = await fetchLatestScreenshotUrl();
          if (nextUrl && nextUrl !== prev) break;
        } catch {
          // ignore and keep polling briefly
        }
        await new Promise((r) => setTimeout(r, 2000));
      }

      // 3) Update UI
      setDevice((d) => {
        if (!d) return d;
        return {
          ...d,
          lastScreenshot: nextUrl ?? d.lastScreenshot,
        };
      });
    } catch (e) {
      console.error(e);
      alert(safeErr(e));
    } finally {
      setScreenshotBusy(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-[#6b6b6b]">Loading device…</div>;
  }

  if (error || !device) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate("/devices")}
          className="inline-flex items-center gap-2 text-[#5b7a5b] hover:underline mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Devices
        </button>

        <div className="bg-white border border-[#e0ddd5] rounded-xl p-4">
          <div className="text-[#c9534a] font-semibold mb-1">Couldn’t load device</div>
          <div className="text-sm text-[#6b6b6b]">{error ?? "Unknown error"}</div>
          <button
            onClick={loadAll}
            className="mt-3 px-3 py-2 rounded bg-[#5b7a5b] text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/devices")}
          className="inline-flex items-center gap-2 text-[#5b7a5b] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex-1" />

        <button
          onClick={loadAll}
          className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-[#f5f5f0]"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Header */}
      <div className="bg-white border border-[#e0ddd5] rounded-2xl p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-semibold text-[#3d3d3d]">{device.name}</div>
            <div className="text-sm text-[#6b6b6b]">Device ID: {device.id}</div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border">
            <Power className={`w-4 h-4 ${isOnline ? "text-[#5b7a5b]" : "text-[#b5836d]"}`} />
            <span className={`text-sm ${isOnline ? "text-[#5b7a5b]" : "text-[#b5836d]"}`}>
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#e0ddd5] rounded-2xl p-4 shadow-sm space-y-4">
          <div className="font-semibold text-[#3d3d3d]">Quick Controls</div>

          <BrightnessControl deviceId={deviceId} />
          <VolumeControl deviceId={deviceId} />

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-[#f5f5f0]"
              onClick={() => send("MUTE")}
            >
              <VolumeX className="w-4 h-4" />
              Mute
            </button>

            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-[#f5f5f0]"
              onClick={() => send("UNMUTE")}
            >
              <Volume2 className="w-4 h-4" />
              Unmute
            </button>

            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-[#f5f5f0]"
              onClick={() => send("SCREEN_OFF")}
            >
              <MonitorOff className="w-4 h-4" />
              Screen Off
            </button>

            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-[#f5f5f0]"
              onClick={() => send("SCREEN_ON")}
            >
              <MonitorUp className="w-4 h-4" />
              Screen On
            </button>

            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-[#f5f5f0]"
              onClick={() => send("RESTART_APP")}
            >
              <RotateCcw className="w-4 h-4" />
              Restart App
            </button>

            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-[#f5f5f0]"
              onClick={handleScreenshotClick}
              disabled={screenshotBusy}
              title={screenshotBusy ? "Capturing…" : "Take screenshot"}
            >
              <Camera className="w-4 h-4" />
              {screenshotBusy ? "Screenshot…" : "Screenshot"}
            </button>
          </div>

          {/* Latest screenshot (if available) */}
          {device.lastScreenshot ? (
            <div className="pt-4">
              <div className="text-sm font-medium text-[#3d3d3d] mb-2">Latest Screenshot</div>
              <div className="border rounded-xl overflow-hidden bg-black">
                <img
                  key={device.lastScreenshot} // force re-mount when URL changes
                  src={device.lastScreenshot}
                  alt="Latest device screenshot"
                  className="w-full h-auto"
                />
              </div>
              <div className="text-xs text-[#6b6b6b] mt-2">
                Press <b>Screenshot</b> again anytime — it will auto-refresh when the new image arrives.
              </div>
            </div>
          ) : (
            <div className="pt-4 text-xs text-[#6b6b6b]">No screenshot yet.</div>
          )}
        </div>

        <div className="bg-white border border-[#e0ddd5] rounded-2xl p-4 shadow-sm">
          <div className="font-semibold text-[#3d3d3d] mb-3">Command History</div>

          {loadingHistory && <div className="text-sm text-[#6b6b6b]">Loading history…</div>}

          {!loadingHistory && history.length === 0 && (
            <div className="text-sm text-[#6b6b6b]">No commands yet.</div>
          )}

          {!loadingHistory && history.length > 0 && (
            <div className="space-y-2">
              {history.map((row) => (
                <div key={row.id} className="border rounded-xl p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-[#3d3d3d]">
                      {row?.payload?.type ?? "COMMAND"}
                      {row?.payload?.value !== undefined ? ` (${row.payload.value})` : ""}
                    </div>
                    <div className="text-xs text-[#6b6b6b]">{fmtTime(row.created_at)}</div>
                  </div>

                  <div className="mt-1 text-xs text-[#6b6b6b]">
                    Sent: {row.sent ? "Yes" : "No"} • Executed: {row.executed ? "Yes" : "No"} •
                    Executed at: {fmtTime(row.executed_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
