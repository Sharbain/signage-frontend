// client/src/pages/DeviceControlPage.tsx
import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface DeviceDetails {
  id: string;
  name: string;
  status: string;
  lastHeartbeat?: string | null;
  currentContentName?: string | null;
  lastScreenshot?: string | null;
  brightness?: number;
  volume?: number;
  thumbnail?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

type CommandHistoryRow = {
  id: number | string;
  payload: any;
  sent: boolean;
  executed: boolean;
  executed_at: string | null;
  created_at: string;
};

type DataUsageInfo = {
  totalDownloaded: number;
  totalUploaded: number;
  total: number;
  recordCount: number;
  firstRecord: string | null;
  lastRecord: string | null;
  dailyBreakdown: { date: string; downloaded: number; uploaded: number }[];
};

type TimePeriod = "today" | "week" | "month" | "year" | "all";

type PowerScheduleEntry = {
  id?: number;
  daysOfWeek: number[];
  powerOnTime: string;
  powerOffTime: string;
  enabled: boolean;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getDateRange(period: TimePeriod): { startDate: string | null; endDate: string | null } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case "today":
      return { startDate: today.toISOString(), endDate: null };
    case "week": {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { startDate: weekAgo.toISOString(), endDate: null };
    }
    case "month": {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return { startDate: monthAgo.toISOString(), endDate: null };
    }
    case "year": {
      const yearAgo = new Date(today);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return { startDate: yearAgo.toISOString(), endDate: null };
    }
    case "all":
    default:
      return { startDate: null, endDate: null };
  }
}

const primaryButton =
  "inline-flex items-center justify-center gap-1 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-medium px-4 py-2.5 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed";
const ghostButton =
  "inline-flex items-center justify-center gap-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-xs text-slate-700 font-medium px-4 py-2.5 transition disabled:opacity-60 disabled:cursor-not-allowed";

function formatWhen(ts?: string | null) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function statusBadge(row: CommandHistoryRow) {
  if (!row.sent) {
    return { label: "Pending", cls: "bg-slate-100 text-slate-700 border-slate-200" };
  }
  if (row.sent && !row.executed) {
    return { label: "Sent", cls: "bg-amber-50 text-amber-800 border-amber-200" };
  }
  return { label: "Executed", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" };
}

const DeviceControlPage = () => {
  const { id } = useParams<{ id: string }>();

  const [device, setDevice] = useState<DeviceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<CommandHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  
  const [dataUsage, setDataUsage] = useState<DataUsageInfo | null>(null);
  const [dataUsageLoading, setDataUsageLoading] = useState(false);
  const [dataUsagePeriod, setDataUsagePeriod] = useState<TimePeriod>("month");
  
  const miniMapRef = useRef<HTMLDivElement>(null);
  const miniMapInstanceRef = useRef<L.Map | null>(null);
  const miniMarkerRef = useRef<L.Marker | null>(null);
  
  const [brightness, setBrightness] = useState(100);
  const [volume, setVolume] = useState(70);
  
  const [showPowerSchedule, setShowPowerSchedule] = useState(false);
  const [powerSchedules, setPowerSchedules] = useState<PowerScheduleEntry[]>([
    { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], powerOnTime: "08:00", powerOffTime: "22:00", enabled: true }
  ]);
  const [savingPowerSchedule, setSavingPowerSchedule] = useState(false);

  /* ===========================
     LOAD DEVICE
  =========================== */
  async function load() {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("accessToken") || "";
      const res = await fetch(`/api/devices/${id}/details`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error(`Failed to load device (${res.status})`);
      setDevice(await res.json());
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load device");
    } finally {
      setLoading(false);
    }
  }

  /* ===========================
     LOAD COMMAND HISTORY
  =========================== */
  async function loadHistory() {
    if (!id) return;
    try {
      setHistoryLoading(true);
      setHistoryError(null);

      const token = localStorage.getItem("accessToken") || "";
      const res = await fetch(`/api/device/${id}/commands/history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error(`Failed (${res.status})`);

      const text = await res.text();
      const rows = JSON.parse(text);
      setHistory(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      console.error(e);
      setHistoryError("Failed to load command history");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  /* ===========================
     SEND COMMAND (CMS → DEVICE)
  =========================== */
  async function sendCommand(payload: any, label?: string) {
    if (!id) return;

    try {
      setBusy(label || payload.type);
      const token = localStorage.getItem("accessToken") || "";

      const res = await fetch(`/api/device/${id}/command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Command failed (${res.status})`);
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to send command");
    } finally {
      setBusy(null);
      setTimeout(() => {
        load();
        loadHistory();
      }, 800);
    }
  }

  /* ===========================
     LOAD DATA USAGE
  =========================== */
  async function loadDataUsage() {
    if (!id) return;
    try {
      setDataUsageLoading(true);
      const token = localStorage.getItem("accessToken") || "";
      const { startDate, endDate } = getDateRange(dataUsagePeriod);
      
      let url = `/api/devices/${id}/data-usage`;
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      setDataUsage(data);
    } catch (e: any) {
      console.error(e);
      setDataUsage(null);
    } finally {
      setDataUsageLoading(false);
    }
  }

  /* ===========================
     UPLOAD DEVICE THUMBNAIL
  =========================== */
  async function handleThumbnailUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    try {
      setUploadingThumbnail(true);
      const formData = new FormData();
      formData.append("thumbnail", file);

      const token = localStorage.getItem("accessToken") || "";
      const res = await fetch(`/api/device/${id}/thumbnail`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Upload failed");
      }

      await load();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to upload thumbnail");
    } finally {
      setUploadingThumbnail(false);
    }
  }

  useEffect(() => {
    load();
    loadHistory();
    loadDataUsage();
  }, [id]);

  // Update local state when device loads
  useEffect(() => {
    if (device) {
      setBrightness(device.brightness ?? 100);
      setVolume(device.volume ?? 70);
    }
  }, [device?.brightness, device?.volume]);

  useEffect(() => {
    loadDataUsage();
  }, [dataUsagePeriod]);

  useEffect(() => {
    if (!id) return;
    const t = setInterval(loadHistory, 5000);
    return () => clearInterval(t);
  }, [id]);

  // Initialize mini map when device has location
  useEffect(() => {
    if (!device?.latitude || !device?.longitude || !miniMapRef.current) return;
    
    // If map already exists, just update the marker position
    if (miniMapInstanceRef.current) {
      miniMapInstanceRef.current.setView([device.latitude, device.longitude], 15);
      if (miniMarkerRef.current) {
        miniMarkerRef.current.setLatLng([device.latitude, device.longitude]);
      }
      return;
    }
    
    // Create new map
    const map = L.map(miniMapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
    }).setView([device.latitude, device.longitude], 15);
    
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    
    // Create marker with status color
    const isOnlineStatus = device.status?.toLowerCase().includes("online");
    const markerColor = isOnlineStatus ? "#22c55e" : "#ef4444";
    
    const icon = L.divIcon({
      html: `<div style="background-color: ${markerColor}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
      className: "custom-dot-marker",
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    
    const marker = L.marker([device.latitude, device.longitude], { icon }).addTo(map);
    marker.bindTooltip(device.name || "Device", { permanent: false, direction: "top" });
    
    miniMapInstanceRef.current = map;
    miniMarkerRef.current = marker;
    
    return () => {
      map.remove();
      miniMapInstanceRef.current = null;
      miniMarkerRef.current = null;
    };
  }, [device?.latitude, device?.longitude, device?.status, device?.name]);

  const isOnline = device?.status?.toLowerCase().includes("online");
  const historyRows = useMemo(() => history.slice(0, 20), [history]);

  if (loading && !device) return <div className="text-sm text-slate-500">Loading device…</div>;
  if (error && !device)
    return <div className="text-sm text-rose-600 bg-rose-50 p-3 rounded">{error}</div>;
  if (!device)
    return <div className="text-sm text-slate-500">No device selected.</div>;

  /* ===========================
     UI
  =========================== */
  return (
    <div className="space-y-6">

      {/* LIVE PREVIEW */}
      <section className="bg-white border rounded-3xl p-5">
        <div className="flex justify-between mb-3">
          <h2 className="text-sm font-semibold">Live Preview</h2>
          <div className="flex gap-2">
            <button
              className={ghostButton}
              disabled={busy !== null}
              onClick={() => sendCommand({ type: "SCREENSHOT" }, "Screenshot")}
            >
              {busy === "Screenshot" ? "Capturing…" : "Screenshot"}
            </button>
            <button
              className={ghostButton}
              disabled={busy !== null}
              onClick={() => sendCommand({ type: "RECORD", duration: 30 }, "Record")}
            >
              {busy === "Record" ? "Recording…" : "Record 30s"}
            </button>
          </div>
        </div>

        <div className="h-64 bg-black rounded flex items-center justify-center">
          {device.lastScreenshot ? (
            <img src={device.lastScreenshot} className="object-contain h-full" />
          ) : (
            <span className="text-xs text-slate-400">No screenshot</span>
          )}
        </div>
      </section>

      {/* DEVICE THUMBNAIL & MINI MAP */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* DEVICE THUMBNAIL */}
        <section className="bg-white border rounded-3xl p-5">
          <h2 className="text-sm font-semibold mb-3">Device Picture</h2>
          <p className="text-xs text-slate-500 mb-3">
            Upload a picture of this device to identify it on the map
          </p>
          
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200">
              {device.thumbnail ? (
                <img src={device.thumbnail} className="object-cover w-full h-full" alt="Device thumbnail" />
              ) : (
                <span className="text-xs text-slate-400 text-center px-2">No image</span>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <label className={`${ghostButton} cursor-pointer`}>
                {uploadingThumbnail ? "Uploading..." : "Upload Picture"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleThumbnailUpload}
                  disabled={uploadingThumbnail}
                  className="hidden"
                  data-testid="input-device-thumbnail"
                />
              </label>
              <span className="text-xs text-slate-400">Max 5MB, JPG/PNG/GIF/WebP</span>
            </div>
          </div>
        </section>

        {/* MINI MAP */}
        <section className="bg-white border rounded-3xl p-5">
          <h2 className="text-sm font-semibold mb-3">Device Location</h2>
          {device.latitude && device.longitude ? (
            <div 
              ref={miniMapRef} 
              className="h-32 rounded-lg overflow-hidden border border-slate-200 cursor-pointer"
              onClick={() => window.location.href = '/devices'}
              data-testid="mini-map-container"
            />
          ) : (
            <div className="h-32 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
              <span className="text-xs text-slate-400">No location set</span>
            </div>
          )}
          <p className="text-xs text-slate-500 mt-2">
            Click to view on full map
          </p>
        </section>
      </div>

      {/* CONTROLS */}
      <div className="grid xl:grid-cols-3 gap-6">

        {/* BRIGHTNESS */}
        <section className="bg-white border rounded-3xl p-5 space-y-3">
          <h2 className="text-sm font-semibold">Display</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Brightness</span>
              <span className="font-medium">{brightness}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              onMouseUp={async () => {
                sendCommand({ type: "SET_BRIGHTNESS", value: brightness });
                const token = localStorage.getItem("accessToken") || "";
                fetch(`/api/devices/${id}/settings`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                  body: JSON.stringify({ brightness }),
                });
              }}
              onTouchEnd={async () => {
                sendCommand({ type: "SET_BRIGHTNESS", value: brightness });
                const token = localStorage.getItem("accessToken") || "";
                fetch(`/api/devices/${id}/settings`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                  body: JSON.stringify({ brightness }),
                });
              }}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              data-testid="slider-brightness"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button className={ghostButton} onClick={() => sendCommand({ type: "SCREEN_OFF" })}>
              Screen Off
            </button>
            <button className={ghostButton} onClick={() => sendCommand({ type: "SCREEN_ON" })}>
              Screen On
            </button>
          </div>
        </section>

        {/* AUDIO */}
        <section className="bg-white border rounded-3xl p-5 space-y-3">
          <h2 className="text-sm font-semibold">Audio</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Volume</span>
              <span className="font-medium">{volume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              onMouseUp={async () => {
                sendCommand({ type: "SET_VOLUME", value: volume });
                const token = localStorage.getItem("accessToken") || "";
                fetch(`/api/devices/${id}/settings`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                  body: JSON.stringify({ volume }),
                });
              }}
              onTouchEnd={async () => {
                sendCommand({ type: "SET_VOLUME", value: volume });
                const token = localStorage.getItem("accessToken") || "";
                fetch(`/api/devices/${id}/settings`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                  body: JSON.stringify({ volume }),
                });
              }}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              data-testid="slider-volume"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button className={ghostButton} onClick={() => sendCommand({ type: "MUTE" })}>
              Mute
            </button>
            <button className={ghostButton} onClick={() => sendCommand({ type: "UNMUTE" })}>
              Unmute
            </button>
          </div>
        </section>

        {/* SYSTEM */}
        <section className="bg-white border rounded-3xl p-5 space-y-2">
          <h2 className="text-sm font-semibold">System</h2>
          <button className={ghostButton}
            onClick={() => sendCommand({ type: "SHUTDOWN" }, "Shutdown")}>
            {busy === "Shutdown" ? "Turning Off…" : "Turn Off Device"}
          </button>
          <button className={ghostButton}
            onClick={() => sendCommand({ type: "REBOOT" })}>
            Reboot
          </button>
          <button className={ghostButton}
            onClick={() => sendCommand({ type: "PING", message: "This Device is being pingged" }, "Ping")}>
            Ping Device
          </button>
          <button className={ghostButton}
            onClick={async () => {
              setShowPowerSchedule(true);
              try {
                const token = localStorage.getItem("accessToken") || "";
                const res = await fetch(`/api/devices/${id}/power-schedule`, {
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (res.ok) {
                  const data = await res.json();
                  if (data.schedules && data.schedules.length > 0) {
                    setPowerSchedules(data.schedules.map((s: any) => ({
                      id: s.id,
                      daysOfWeek: s.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
                      powerOnTime: s.powerOnTime || "08:00",
                      powerOffTime: s.powerOffTime || "22:00",
                      enabled: s.enabled ?? true,
                    })));
                  } else {
                    setPowerSchedules([
                      { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], powerOnTime: "08:00", powerOffTime: "22:00", enabled: true }
                    ]);
                  }
                }
              } catch (e) {
                console.error("Failed to load power schedule", e);
              }
            }}>
            Set On/Off Schedule
          </button>
        </section>
      </div>

      {/* POWER SCHEDULE DIALOG */}
      {showPowerSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPowerSchedule(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Device On/Off Schedule</h3>
            <p className="text-sm text-slate-500 mb-4">
              Set different on/off times for different days of the week. You can add multiple schedules.
            </p>
            
            <div className="space-y-4">
              {powerSchedules.map((schedule, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={schedule.enabled}
                        onChange={(e) => {
                          const updated = [...powerSchedules];
                          updated[idx].enabled = e.target.checked;
                          setPowerSchedules(updated);
                        }}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <span className="text-sm font-medium">Schedule {idx + 1}</span>
                    </div>
                    {powerSchedules.length > 1 && (
                      <button
                        className="text-red-500 hover:text-red-700 text-xs"
                        onClick={() => {
                          setPowerSchedules(powerSchedules.filter((_, i) => i !== idx));
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className={`space-y-3 ${!schedule.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div>
                      <label className="text-xs text-slate-500 block mb-2">Days of the week:</label>
                      <div className="flex gap-1 flex-wrap">
                        {DAY_NAMES.map((day, dayIdx) => (
                          <button
                            key={dayIdx}
                            type="button"
                            onClick={() => {
                              const updated = [...powerSchedules];
                              const days = updated[idx].daysOfWeek;
                              if (days.includes(dayIdx)) {
                                updated[idx].daysOfWeek = days.filter(d => d !== dayIdx);
                              } else {
                                updated[idx].daysOfWeek = [...days, dayIdx].sort();
                              }
                              setPowerSchedules(updated);
                            }}
                            className={`w-10 h-8 text-xs rounded-md border transition ${
                              schedule.daysOfWeek.includes(dayIdx)
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                            }`}
                            data-testid={`btn-day-${dayIdx}-schedule-${idx}`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-600">On at:</label>
                        <input
                          type="time"
                          value={schedule.powerOnTime}
                          onChange={(e) => {
                            const updated = [...powerSchedules];
                            updated[idx].powerOnTime = e.target.value;
                            setPowerSchedules(updated);
                          }}
                          className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                          data-testid={`input-power-on-time-${idx}`}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-600">Off at:</label>
                        <input
                          type="time"
                          value={schedule.powerOffTime}
                          onChange={(e) => {
                            const updated = [...powerSchedules];
                            updated[idx].powerOffTime = e.target.value;
                            setPowerSchedules(updated);
                          }}
                          className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                          data-testid={`input-power-off-time-${idx}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                className={`${ghostButton} w-full`}
                onClick={() => {
                  setPowerSchedules([...powerSchedules, {
                    daysOfWeek: [],
                    powerOnTime: "08:00",
                    powerOffTime: "22:00",
                    enabled: true,
                  }]);
                }}
              >
                + Add Another Schedule
              </button>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                className={ghostButton}
                onClick={() => setShowPowerSchedule(false)}
              >
                Cancel
              </button>
              <button
                className={primaryButton}
                disabled={savingPowerSchedule}
                onClick={async () => {
                  setSavingPowerSchedule(true);
                  try {
                    const token = localStorage.getItem("accessToken") || "";
                    await fetch(`/api/devices/${id}/power-schedule`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({ schedules: powerSchedules }),
                    });
                    setShowPowerSchedule(false);
                    alert("Power schedules saved successfully!");
                  } catch (e) {
                    alert("Failed to save power schedules");
                  } finally {
                    setSavingPowerSchedule(false);
                  }
                }}
              >
                {savingPowerSchedule ? "Saving..." : "Save Schedules"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DATA CONSUMPTION */}
      <section className="bg-white border rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Data Consumption</h2>
          <select
            value={dataUsagePeriod}
            onChange={(e) => setDataUsagePeriod(e.target.value as TimePeriod)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
            data-testid="select-data-period"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="year">Last Year</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {dataUsageLoading ? (
          <div className="text-xs text-slate-500">Loading data usage...</div>
        ) : dataUsage ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-slate-800" data-testid="text-total-data">
                  {formatBytes(dataUsage.total)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Total</div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-emerald-700" data-testid="text-downloaded-data">
                  {formatBytes(dataUsage.totalDownloaded)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Downloaded</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-700" data-testid="text-uploaded-data">
                  {formatBytes(dataUsage.totalUploaded)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Uploaded</div>
              </div>
            </div>

            {dataUsage.dailyBreakdown.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-slate-600 mb-2">Daily Breakdown</h3>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="text-slate-500 border-b">
                      <tr>
                        <th className="text-left py-1">Date</th>
                        <th className="text-right py-1">Downloaded</th>
                        <th className="text-right py-1">Uploaded</th>
                        <th className="text-right py-1">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataUsage.dailyBreakdown.map((day, idx) => (
                        <tr key={idx} className="border-t border-slate-100">
                          <td className="py-1.5">{new Date(day.date).toLocaleDateString()}</td>
                          <td className="text-right text-emerald-600">{formatBytes(day.downloaded)}</td>
                          <td className="text-right text-blue-600">{formatBytes(day.uploaded)}</td>
                          <td className="text-right font-medium">{formatBytes(day.downloaded + day.uploaded)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {dataUsage.recordCount === 0 && (
              <div className="text-center py-6 text-slate-400 text-sm">
                No data usage recorded for this period
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-sm">
            Unable to load data usage
          </div>
        )}
      </section>

      {/* COMMAND HISTORY */}
      <section className="bg-white border rounded-3xl p-5">
        <h2 className="text-sm font-semibold mb-3">Command History</h2>

        <table className="w-full text-sm">
          <tbody>
            {historyRows.map(r => {
              const b = statusBadge(r);
              return (
                <tr key={String(r.id)} className="border-t">
                  <td className="py-2">
                    <span className={`px-2 py-1 text-xs rounded ${b.cls}`}>
                      {b.label}
                    </span>
                  </td>
                  <td>{r.payload?.type}</td>
                  <td>{formatWhen(r.created_at)}</td>
                  <td>{formatWhen(r.executed_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default DeviceControlPage;
