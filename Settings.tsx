import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BrightnessControl } from "@/components/BrightnessControl";
import { Wifi, Smartphone, HardDrive, Clock, Power, Layout } from "lucide-react";

type Device = {
  id: string;
  name: string;
  status: string;
  templateName?: string;
  signalStrength?: number;
  connectionType?: string;
  freeStorage?: number;
  lastOffline?: string;
};

export default function DeviceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const deviceId = id as string;

  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/devices/${deviceId}/details`);
        const data = await res.json();
        setDevice(data);
      } finally {
        setLoading(false);
      }
    }

    if (deviceId) {
      load();
    }
  }, [deviceId]);

  if (loading || !device) {
    return <div className="p-6 text-[#6b6b6b]">Loading...</div>;
  }

  const formatStorage = (bytes?: number) => {
    if (!bytes) return "—";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  const formatLastOffline = (dateStr?: string) => {
    if (!dateStr) return "Never offline";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    }
    if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    }
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
    }
    return "Just now";
  };

  const getSignalIcon = () => {
    const type = device.connectionType || "wifi";
    if (type === "mobile" || type === "cellular" || type === "sim") {
      return <Smartphone className="h-5 w-5" />;
    }
    return <Wifi className="h-5 w-5" />;
  };

  const getSignalLabel = () => {
    const type = device.connectionType || "wifi";
    if (type === "mobile" || type === "cellular" || type === "sim") {
      return "Mobile Data";
    }
    return "Wi-Fi";
  };

  const getSignalStrengthLabel = (strength?: number) => {
    if (!strength) return "Unknown";
    if (strength >= -50) return "Excellent";
    if (strength >= -60) return "Good";
    if (strength >= -70) return "Fair";
    return "Poor";
  };

  const getSignalColor = (strength?: number) => {
    if (!strength) return "text-gray-400";
    if (strength >= -50) return "text-green-500";
    if (strength >= -60) return "text-green-400";
    if (strength >= -70) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="p-6">
      <button
        onClick={() => navigate("/devices")}
        className="text-[#5b7a5b] hover:underline mb-4"
        data-testid="button-back-devices"
      >
        ← Back to Devices
      </button>

      <h1 className="text-xl font-semibold mb-2 text-[#3d3d3d]">
        {device.name}
      </h1>
      <p className="text-[#6b6b6b] mb-4">
        Device ID: {device.id}
      </p>

      <div className="bg-white rounded-xl shadow border border-[#e0ddd5] p-4 mb-6">
        <h2 className="font-semibold mb-4 text-[#3d3d3d]">
          Device Information
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" data-testid="device-status">
            <div className={`p-2 rounded-full ${device.status === "Online" ? "bg-green-100" : "bg-red-100"}`}>
              <Power className={`h-5 w-5 ${device.status === "Online" ? "text-green-600" : "text-red-600"}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className={`font-medium ${device.status === "Online" ? "text-green-600" : "text-red-600"}`}>
                {device.status}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" data-testid="device-template">
            <div className="p-2 rounded-full bg-blue-100">
              <Layout className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Assigned Template</p>
              <p className="font-medium text-gray-800">
                {device.templateName || "No template assigned"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" data-testid="device-signal">
            <div className={`p-2 rounded-full ${device.signalStrength ? "bg-cyan-100" : "bg-gray-100"}`}>
              <span className={getSignalColor(device.signalStrength)}>
                {getSignalIcon()}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Signal ({getSignalLabel()})</p>
              <p className={`font-medium ${getSignalColor(device.signalStrength)}`}>
                {getSignalStrengthLabel(device.signalStrength)}
                {device.signalStrength && <span className="text-gray-400 text-sm ml-1">({device.signalStrength} dBm)</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" data-testid="device-storage">
            <div className="p-2 rounded-full bg-purple-100">
              <HardDrive className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Free Storage</p>
              <p className="font-medium text-gray-800">
                {formatStorage(device.freeStorage)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" data-testid="device-last-offline">
            <div className="p-2 rounded-full bg-orange-100">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Time Offline</p>
              <p className="font-medium text-gray-800">
                {formatLastOffline(device.lastOffline)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-[#e0ddd5] p-4 mb-6">
        <h2 className="font-semibold mb-3 text-[#3d3d3d]">
          Device Controls
        </h2>

        <BrightnessControl deviceId={deviceId} />
      </div>
    </div>
  );
}
