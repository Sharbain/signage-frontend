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
  payload: any;
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
  const [lastScreenshotAt, setLastScreenshotAt] = useState<string | null>(null);

  const isOnline = useMemo(() => {
    const s = (device?.status || "").toLowerCase();
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
    return withCacheBuster(absolute);
  }

  async function loadAll() {
    try {
      setLoading(true);
      setError(null);

      const details = await api.devices.details(deviceId);

      try {
        const shotUrl = await fetchLatestScreenshotUrl();
        (details as any).lastScreenshot = shotUrl;
        if (shotUrl) {
          setLastScreenshotAt(new Date().toISOString());
        }
      } catch {
        (details as any).lastScreenshot = null;
      }

      setDevice(details);

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
      await api.devices.command(deviceId, { type: "SCREENSHOT" });
      await refreshHistoryOnly();

      const deadline = Date.now() + 20000;
      let nextUrl: string | null = null;

      while (Date.now() < deadline) {
        nextUrl = await fetchLatestScreenshotUrl();
        if (nextUrl && nextUrl !== prev) break;
        await new Promise((r) => setTimeout(r, 2000));
      }

      setDevice((d) => {
        if (!d) return d;
        return { ...d, lastScreenshot: nextUrl ?? d.lastScreenshot };
      });

      if (nextUrl) {
        setLastScreenshotAt(new Date().toISOString());
      }
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
    return <div className="p-6 text-[#c9534a]">Couldn’t load device.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/devices")} className="inline-flex items-center gap-2 text-[#5b7a5b] hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex-1" />
        <button onClick={loadAll} className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-[#f5f5f0]">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#e0ddd5] rounded-2xl p-4 shadow-sm space-y-4">
          <div className="font-semibold text-[#3d3d3d]">Quick Controls</div>

          <BrightnessControl deviceId={deviceId} />
          <VolumeControl deviceId={deviceId} />

          <div className="flex flex-wrap gap-2 pt-2">
            <button className="inline-flex items-center gap-2 px-3 py-2 rounded border bg-white hover:bg-[#f5f5f0]" onClick={handleScreenshotClick}>
              <Camera className="w-4 h-4" />
              {screenshotBusy ? "Screenshot…" : "Screenshot"}
            </button>
          </div>

          {device.lastScreenshot ? (
            <div className="pt-4">
              <div className="text-sm font-medium text-[#3d3d3d] mb-2">Latest Screenshot</div>
              <div className="border rounded-xl overflow-hidden bg-black">
                <img key={device.lastScreenshot} src={device.lastScreenshot} alt="Latest device screenshot" className="w-full h-auto" />
              </div>
              <div className="text-xs text-[#6b6b6b] mt-2">
                {fmtTime(lastScreenshotAt)}
              </div>
            </div>
          ) : (
            <div className="pt-4 text-xs text-[#6b6b6b]">No screenshot yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
