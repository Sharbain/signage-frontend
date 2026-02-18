import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "../styles/device-popup.css";

interface Device {
  id: string;
  name: string;
  status: "online" | "recently_offline" | "offline";
  latitude: number | null;
  longitude: number | null;
  lastHeartbeat?: string | null;
  thumbnail?: string | null;
  group?: string | null;
}

function renderPopupHTML(device: Device) {
  const statusClass =
    device.status === "online"
      ? "status-online"
      : device.status === "recently_offline"
      ? "status-recent"
      : "status-offline";

  const thumb = device.thumbnail || "/images/no-preview.png";

  return `
    <div class="popup-container">
      <img src="${thumb}" class="popup-thumb" />

      <h3 class="popup-title">${device.name || "Unnamed Device"}</h3>

      <div class="popup-status ${statusClass}">
        ${device.status.replace("_", " ")}
      </div>

      <div class="popup-line">
        <strong>Last heartbeat:</strong><br>
        ${device.lastHeartbeat || "No data"}
      </div>

      ${
        device.group
          ? `<div class="popup-line"><strong>Group:</strong> ${device.group}</div>`
          : ""
      }

      <button class="popup-btn" onclick="window.location.href='/devices/${device.id}'">
        Open Device Control
      </button>
    </div>
  `;
}

function createMarkerIcon(status: string, hasError?: boolean) {
  // Use colored circle dots based on status
  const colorMap: Record<string, string> = {
    online: "#22c55e",      // green
    recently_offline: "#eab308", // yellow
    offline: "#ef4444",     // red
    error: "#f59e0b",       // amber/orange for errors
  };
  
  const color = hasError ? colorMap.error : (colorMap[status] || colorMap.offline);
  const pulseClass = status === "recently_offline" ? "pulse-dot" : "";
  
  // Create a simple circle div icon
  return L.divIcon({
    html: `<div class="device-dot ${pulseClass}" style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
    className: "custom-dot-marker",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

const DeviceMap = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const mapRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  async function loadDevices() {
    try {
      const res = await fetch("/api/devices/locations");
      const result = await res.json();

      const deviceList = Array.isArray(result) ? result : result.devices || [];
      setDevices(deviceList);

      if (!mapRef.current) return;

      const map = mapRef.current;

      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
      }

      const clusterGroup = L.markerClusterGroup();
      clusterGroupRef.current = clusterGroup;

      deviceList.forEach((device: Device) => {
        if (!device.latitude || !device.longitude) return;

        const marker = L.marker([device.latitude, device.longitude], {
          icon: createMarkerIcon(device.status),
        });

        // Add tooltip for hover to show device name
        marker.bindTooltip(device.name || "Unnamed Device", {
          permanent: false,
          direction: "top",
          offset: [0, -10],
          className: "device-tooltip",
        });

        marker.bindPopup(renderPopupHTML(device));
        clusterGroup.addLayer(marker);
      });

      clusterGroup.addTo(map);
    } catch (error) {
      console.error("MAP REFRESH ERROR:", error);
    }
  }

  useEffect(() => {
    const map = L.map("device-map").setView([31.95, 35.91], 8);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    loadDevices();

    const interval = setInterval(loadDevices, 15000);

    return () => {
      clearInterval(interval);
      map.remove();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2d3a2d]">Device Map</h1>
          <p className="text-[#5b7a5b] mt-1">View device locations with live status</p>
        </div>

        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            Online ({devices.filter(d => d.status === "online").length})
          </span>

          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            Recently Offline ({devices.filter(d => d.status === "recently_offline").length})
          </span>

          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            Offline ({devices.filter(d => d.status === "offline").length})
          </span>

          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-400"></span>
            No Location ({devices.filter(d => !d.latitude || !d.longitude).length})
          </span>
        </div>
      </div>

      <div
        id="device-map"
        style={{ height: "600px" }}
        className="rounded-xl overflow-hidden border border-[#e0e0d8] shadow-sm"
      ></div>
    </div>
  );
};

export default DeviceMap;
