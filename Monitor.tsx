import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Monitor, Clock, Calendar, AlertTriangle, Play, Image, Film, FileText } from "lucide-react";

type DashboardSummary = {
  activeDevices: number;
  offlineDevices: number;
  todaysImpressions: number;
};

type DeviceCard = {
  id: string;
  name: string;
  location_branch: string;
  is_online: boolean;
  last_seen?: string;
};

type LiveContent = {
  id: string;
  name: string;
  type: string;
  deviceCount: number;
};

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<DeviceCard[]>([]);
  const [liveContent, setLiveContent] = useState<LiveContent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return "Never";
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data: DashboardSummary = await api.dashboard.summary();
        setSummary(data);

        const devicesRes = await api.devices.list();
        if (devicesRes.ok) {
          const devicesData = await devicesRes.json();
          setDevices(devicesData.devices || []);
        } else {
          setDevices([]);
        }

        const contentRes = await api.dashboard.liveContent();
        setLiveContent(contentRes.content || []);
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const offlineDevices = devices.filter(d => !d.is_online);

  const getContentIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'video':
        return <Film className="w-5 h-5 text-purple-500" />;
      case 'image':
        return <Image className="w-5 h-5 text-blue-500" />;
      case 'template':
        return <FileText className="w-5 h-5 text-green-500" />;
      default:
        return <Play className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#3d3d3d]">Dashboard</h1>
        <div className="flex items-center gap-6 bg-white px-6 py-3 rounded-xl border border-[#e0ddd5] shadow-sm">
          <div className="flex items-center gap-2 text-[#5b7a5b]">
            <Calendar className="w-5 h-5" />
            <span className="font-medium" data-testid="text-current-date">{formatDate(currentTime)}</span>
          </div>
          <div className="w-px h-6 bg-[#e0ddd5]" />
          <div className="flex items-center gap-2 text-[#3d3d3d]">
            <Clock className="w-5 h-5" />
            <span className="font-mono text-lg font-semibold" data-testid="text-current-time">{formatTime(currentTime)}</span>
          </div>
        </div>
      </div>

      {loading && <div className="mb-4 text-sm text-[#6b6b6b]">Loading...</div>}
      {error && <div className="mb-4 text-sm text-[#c9534a]">Error: {error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-[#e0ddd5] shadow-sm">
          <h2 className="text-sm text-[#6b6b6b]">Online Devices</h2>
          <p className="text-3xl font-bold mt-2 text-[#5b7a5b]" data-testid="text-active-devices">
            {summary ? summary.activeDevices : "--"}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#e0ddd5] shadow-sm">
          <h2 className="text-sm text-[#6b6b6b]">Offline Devices</h2>
          <p className="text-3xl font-bold mt-2 text-[#b5836d]" data-testid="text-offline-devices">
            {summary?.offlineDevices ?? "--"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-[#e0ddd5] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#b5836d]" />
              <h2 className="text-xl font-semibold text-[#3d3d3d]">Offline Devices</h2>
            </div>
            <button
              className="text-sm text-[#5b7a5b] hover:underline"
              onClick={() => navigate("/devices")}
              data-testid="link-view-all-devices"
            >
              View all devices
            </button>
          </div>

          {offlineDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Monitor className="w-12 h-12 text-[#5b7a5b] mb-4" />
              <p className="text-sm text-[#5b7a5b] font-medium">All devices are online!</p>
              <p className="text-xs text-[#6b6b6b] mt-1">No offline devices detected.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {offlineDevices.map((dev) => (
                <div
                  key={dev.id}
                  className="p-4 rounded-lg border border-[#b5836d]/30 bg-[#b5836d]/5 flex items-center justify-between"
                  data-testid={`card-offline-device-${dev.id}`}
                >
                  <div>
                    <h3 className="font-semibold text-[#3d3d3d]">
                      {dev.name || `Display ${dev.id}`}
                    </h3>
                    <p className="text-sm text-[#6b6b6b]">
                      {dev.location_branch || "Unknown location"}
                    </p>
                    <p className="text-xs text-[#b5836d] mt-1">
                      Last seen: {formatLastSeen(dev.last_seen)}
                    </p>
                  </div>
                  <button
                    className="px-3 py-1.5 text-sm bg-[#5b7a5b] text-white rounded-lg hover:bg-[#4a6349] transition"
                    onClick={() => navigate(`/devices/${dev.id}`)}
                    data-testid={`button-view-offline-device-${dev.id}`}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#e0ddd5] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-[#5b7a5b]" />
              <h2 className="text-xl font-semibold text-[#3d3d3d]">Live Content</h2>
            </div>
            <button
              className="text-sm text-[#5b7a5b] hover:underline"
              onClick={() => navigate("/schedule")}
              data-testid="link-view-schedule"
            >
              View schedule
            </button>
          </div>

          {liveContent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Play className="w-12 h-12 text-[#6b6b6b] mb-4" />
              <p className="text-sm text-[#6b6b6b]">No content currently playing.</p>
              <p className="text-xs text-[#6b6b6b] mt-1">Schedule content to see it here.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {liveContent.map((content) => (
                <div
                  key={content.id}
                  className="p-4 rounded-lg border border-[#e0ddd5] bg-[#fafaf8] flex items-center justify-between"
                  data-testid={`card-live-content-${content.id}`}
                >
                  <div className="flex items-center gap-3">
                    {getContentIcon(content.type)}
                    <div>
                      <h3 className="font-semibold text-[#3d3d3d]">{content.name}</h3>
                      <p className="text-xs text-[#6b6b6b]">
                        Playing on {content.deviceCount} device{content.deviceCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-[#5b7a5b] bg-[#5b7a5b]/10 px-2 py-1 rounded">
                    <span className="w-2 h-2 bg-[#5b7a5b] rounded-full animate-pulse" />
                    Live
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}