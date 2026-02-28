import { useState, useEffect } from "react";
import { HardDrive, AlertTriangle, Monitor, RefreshCw, Power, Eye, Upload, Plus, X, Wifi, MapPin, Trash2 } from "lucide-react";

export default function DeviceManager() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: "", deviceId: "", location: "", resolution: "1920x1080" });
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());

  type Device = {
    id: number;
    name: string;
    deviceId: string;
    status: string;
    location: string;
    currentContent: string | null;
    currentContentName: string | null;
    temperature: number | null;
    freeStorage: number | null;
    batteryLevel: number | null;
    signalStrength: number | null;
    isOnline: boolean;
    latitude: number | null;
    longitude: number | null;
    errors: string[];
    lastSeen: string | null;
    resolution?: string;
  };

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/devices/list-full")
      .then(res => res.json())
      .then(data => {
        const mapped = (data.devices || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          deviceId: d.id,
          status: d.status || "offline",
          location: d.location_branch || d.location,
          currentContent: d.current_content_id,
          currentContentName: d.current_content_id,
          temperature: d.temperature,
          freeStorage: d.free_storage,
          batteryLevel: d.battery_level,
          signalStrength: d.signal_strength,
          isOnline: d.is_online ?? false,
          latitude: d.latitude,
          longitude: d.longitude,
          errors: d.errors || [],
          lastSeen: d.last_seen ? formatLastSeen(d.last_seen) : (d.last_status_at ? formatLastSeen(d.last_status_at) : null),
          resolution: d.resolution,
        }));
        setDevices(mapped);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch devices:", err);
        setLoading(false);
      });
  }, []);

  const formatLastSeen = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  const handleAddDevice = async () => {
    if (!newDevice.name || !newDevice.deviceId || !newDevice.location) return;
    
    try {
      const res = await fetch("/api/screens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: newDevice.deviceId,
          name: newDevice.name,
          location: newDevice.location,
          resolution: newDevice.resolution,
          status: "offline",
        }),
      });
      
      if (res.ok) {
        const created = await res.json();
        const device: Device = {
          id: created.id,
          name: created.name,
          deviceId: created.deviceId,
          location: created.location,
          resolution: created.resolution,
          status: created.status || "offline",
          currentContent: null,
          currentContentName: null,
          temperature: null,
          freeStorage: null,
          batteryLevel: null,
          signalStrength: null,
          isOnline: false,
          latitude: null,
          longitude: null,
          errors: [],
          lastSeen: "Just added"
        };
        setDevices([...devices, device]);
      }
    } catch (err) {
      console.error("Failed to add device:", err);
    }
    
    setNewDevice({ name: "", deviceId: "", location: "", resolution: "1920x1080" });
    setShowAddModal(false);
  };

  const formatStorage = (bytes: number | null) => {
    if (bytes === null || bytes === 0) return "N/A";
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const toggleDeviceSelection = (deviceId: string) => {
    setSelectedDevices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deviceId)) {
        newSet.delete(deviceId);
      } else {
        newSet.add(deviceId);
      }
      return newSet;
    });
  };

  const handleRemoveDevices = async () => {
    if (selectedDevices.size === 0) return;
    
    const confirmed = window.confirm(`Are you sure you want to remove ${selectedDevices.size} device(s)?`);
    if (!confirmed) return;

    try {
      const deviceIds = Array.from(selectedDevices);
      for (let i = 0; i < deviceIds.length; i++) {
        await fetch(`/api/screens/${deviceIds[i]}`, { method: "DELETE" });
      }
      setDevices(devices.filter(d => !selectedDevices.has(d.deviceId)));
      setSelectedDevices(new Set());
    } catch (err) {
      console.error("Failed to remove devices:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "playing": return "text-[#5b7a5b]";
      case "idle": return "text-[#c9a227]";
      case "offline": return "text-[#b5836d]";
      case "error": return "text-[#c9534a]";
      default: return "text-[#6b6b6b]";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "playing": return "bg-[#5b7a5b]/10";
      case "idle": return "bg-[#c9a227]/10";
      case "offline": return "bg-[#b5836d]/10";
      case "error": return "bg-[#c9534a]/10";
      default: return "bg-[#6b6b6b]/10";
    }
  };

  const filtered = devices.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
                         d.location.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || 
                         (filter === "online" && (d.status === "playing" || d.status === "idle")) ||
                         (filter === "offline" && (d.status === "offline" || d.status === "error"));
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6">

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#3d3d3d]">Device Manager</h1>
        <div className="flex gap-3">
          <button 
            onClick={handleRemoveDevices}
            disabled={selectedDevices.size === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              selectedDevices.size > 0 
                ? "bg-[#c9534a] text-white hover:bg-[#b5443c]" 
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
            data-testid="button-remove-device"
          >
            <Trash2 className="w-5 h-5" />
            Remove {selectedDevices.size > 0 ? `(${selectedDevices.size})` : ""}
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#5b7a5b] text-white rounded-lg hover:bg-[#4a6349] transition"
            data-testid="button-add-device"
          >
            <Plus className="w-5 h-5" />
            Add Device
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Search device or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-3 rounded-lg w-72 border border-[#e0ddd5] bg-white text-[#3d3d3d] focus:outline-none focus:border-[#5b7a5b]"
          data-testid="input-search"
        />

        <button 
          onClick={() => setFilter("online")}
          className={`px-6 py-2 rounded-lg transition ${filter === "online" ? "bg-[#5b7a5b] text-white" : "bg-white border border-[#e0ddd5] text-[#3d3d3d] hover:bg-[#f5f5f0]"}`}
          data-testid="button-filter-online"
        >
          Online
        </button>
        <button 
          onClick={() => setFilter("offline")}
          className={`px-6 py-2 rounded-lg transition ${filter === "offline" ? "bg-[#b5836d] text-white" : "bg-white border border-[#e0ddd5] text-[#3d3d3d] hover:bg-[#f5f5f0]"}`}
          data-testid="button-filter-offline"
        >
          Offline
        </button>
        <button 
          onClick={() => setFilter("all")}
          className={`px-6 py-2 rounded-lg transition ${filter === "all" ? "bg-[#5b7a5b] text-white" : "bg-white border border-[#e0ddd5] text-[#3d3d3d] hover:bg-[#f5f5f0]"}`}
          data-testid="button-filter-all"
        >
          All
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-[#6b6b6b]">Loading devices...</div>
        </div>
      )}

      {!loading && devices.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-[#e0ddd5]">
          <Monitor className="w-12 h-12 text-[#6b6b6b] mb-4" />
          <p className="text-[#6b6b6b] mb-2">No devices registered yet</p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="text-[#5b7a5b] hover:underline"
          >
            Add your first device
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((d, i) => (
          <div key={i} className={`bg-white p-6 rounded-xl border shadow-sm ${selectedDevices.has(d.deviceId) ? "border-[#5b7a5b] ring-2 ring-[#5b7a5b]/20" : "border-[#e0ddd5]"}`} data-testid={`card-device-${i}`}>

            <div className="flex justify-between items-start mb-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedDevices.has(d.deviceId)}
                  onChange={() => toggleDeviceSelection(d.deviceId)}
                  className="mt-1.5 w-4 h-4 rounded border-gray-300 text-[#5b7a5b] focus:ring-[#5b7a5b]"
                  data-testid={`checkbox-device-${i}`}
                />
                <div>
                  <h2 className="text-xl font-semibold text-[#3d3d3d]">{d.name}</h2>
                  <p className="text-sm text-[#6b6b6b]">{d.deviceId}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(d.status)} ${getStatusBg(d.status)}`}>
                ● {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
              </span>
            </div>

            <p className="text-sm text-[#6b6b6b] mb-4">{d.location}</p>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-[#e0ddd5] bg-[#fafaf8]">
                <Monitor className="w-5 h-5 text-[#5b7a5b]" />
                <div className="flex-1">
                  <p className="text-xs text-[#6b6b6b]">Current Content</p>
                  <p className="text-sm font-medium text-[#3d3d3d]">{d.currentContent || "No content"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 rounded-lg border border-[#e0ddd5] bg-[#fafaf8]">
                  <HardDrive className={`w-5 h-5 ${d.freeStorage !== null && d.freeStorage < 1000000000 ? "text-[#c9534a]" : "text-[#5b7a5b]"}`} />
                  <div>
                    <p className="text-xs text-[#6b6b6b]">Storage</p>
                    <p className="text-sm font-medium text-[#3d3d3d]">{formatStorage(d.freeStorage)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg border border-[#e0ddd5] bg-[#fafaf8]">
                  <Wifi className={`w-5 h-5 ${d.signalStrength !== null && d.signalStrength < -80 ? "text-[#c9534a]" : d.signalStrength !== null && d.signalStrength < -60 ? "text-[#c9a227]" : "text-[#5b7a5b]"}`} />
                  <div>
                    <p className="text-xs text-[#6b6b6b]">Signal</p>
                    <p className={`text-sm font-medium ${d.signalStrength !== null && d.signalStrength < -80 ? "text-[#c9534a]" : "text-[#3d3d3d]"}`}>
                      {d.signalStrength !== null ? `${d.signalStrength} dBm` : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {d.latitude !== null && d.longitude !== null && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[#e0ddd5] bg-[#fafaf8]">
                  <MapPin className="w-5 h-5 text-[#5b7a5b]" />
                  <div className="flex-1">
                    <p className="text-xs text-[#6b6b6b]">GPS Location</p>
                    <p className="text-sm font-medium text-[#3d3d3d]">{d.latitude?.toFixed(4)}, {d.longitude?.toFixed(4)}</p>
                  </div>
                </div>
              )}

              {d.errors.length > 0 && (
                <div className="p-3 rounded-lg border border-[#c9534a]/30 bg-[#c9534a]/5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-[#c9534a]" />
                    <span className="text-sm font-medium text-[#c9534a]">Errors ({d.errors.length})</span>
                  </div>
                  <ul className="space-y-1">
                    {d.errors.map((err, idx) => (
                      <li key={idx} className="text-xs text-[#6b6b6b]">• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <p className="text-xs text-[#6b6b6b] mb-4">Last seen: {d.lastSeen}</p>

            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 bg-[#5b7a5b] text-white py-2 rounded-lg hover:bg-[#4a6349] transition" data-testid={`button-push-${i}`}>
                <Upload className="w-4 h-4" />
                Push Content
              </button>
              <button className="flex items-center justify-center gap-2 bg-white border border-[#e0ddd5] text-[#3d3d3d] py-2 rounded-lg hover:bg-[#f5f5f0] transition" data-testid={`button-refresh-${i}`}>
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button className="flex items-center justify-center gap-2 bg-white border border-[#e0ddd5] text-[#3d3d3d] py-2 rounded-lg hover:bg-[#f5f5f0] transition" data-testid={`button-reboot-${i}`}>
                <Power className="w-4 h-4" />
                Reboot
              </button>
              <button className="flex items-center justify-center gap-2 bg-white border border-[#e0ddd5] text-[#3d3d3d] py-2 rounded-lg hover:bg-[#f5f5f0] transition" data-testid={`button-view-${i}`}>
                <Eye className="w-4 h-4" />
                Remote View
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md border border-[#e0ddd5] shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#3d3d3d]">Add New Device</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-[#f5f5f0] rounded-lg transition">
                <X className="w-5 h-5 text-[#6b6b6b]" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3d3d3d] mb-1">Device Name</label>
                <input
                  type="text"
                  placeholder="e.g., Display 5"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                  className="w-full p-3 rounded-lg border border-[#e0ddd5] bg-white text-[#3d3d3d] focus:outline-none focus:border-[#5b7a5b]"
                  data-testid="input-device-name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3d3d3d] mb-1">Device ID</label>
                <input
                  type="text"
                  placeholder="e.g., DEV-005"
                  value={newDevice.deviceId}
                  onChange={(e) => setNewDevice({ ...newDevice, deviceId: e.target.value })}
                  className="w-full p-3 rounded-lg border border-[#e0ddd5] bg-white text-[#3d3d3d] focus:outline-none focus:border-[#5b7a5b]"
                  data-testid="input-device-id"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3d3d3d] mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g., Amman - Branch 2"
                  value={newDevice.location}
                  onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
                  className="w-full p-3 rounded-lg border border-[#e0ddd5] bg-white text-[#3d3d3d] focus:outline-none focus:border-[#5b7a5b]"
                  data-testid="input-device-location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3d3d3d] mb-1">Resolution</label>
                <select
                  value={newDevice.resolution}
                  onChange={(e) => setNewDevice({ ...newDevice, resolution: e.target.value })}
                  className="w-full p-3 rounded-lg border border-[#e0ddd5] bg-white text-[#3d3d3d] focus:outline-none focus:border-[#5b7a5b]"
                  data-testid="select-device-resolution"
                >
                  <option value="1920x1080">1920x1080 (Full HD)</option>
                  <option value="3840x2160">3840x2160 (4K)</option>
                  <option value="1280x720">1280x720 (HD)</option>
                  <option value="1080x1920">1080x1920 (Portrait)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-white border border-[#e0ddd5] text-[#3d3d3d] rounded-lg hover:bg-[#f5f5f0] transition"
                data-testid="button-cancel-add"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDevice}
                className="flex-1 px-4 py-2 bg-[#5b7a5b] text-white rounded-lg hover:bg-[#4a6349] transition"
                data-testid="button-confirm-add"
              >
                Add Device
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
