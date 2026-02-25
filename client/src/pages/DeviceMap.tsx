import { useEffect, useState, useRef } from "react";
import { loadLeaflet } from "../lib/loadLeaflet";
import { api } from "@/lib/api";
import "../styles/device-popup.css";

interface Device {
  id: string;
  name: string;
  status: "online" | "recently_offline" | "offline";
  latitude: number | null;
  longitude: number | null;
}

export default function DeviceMap() {
  const [devices, setDevices] = useState<Device[]>([]);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const clusterGroupRef = useRef<any>(null);

  async function loadDevices() {
    try {
      const res = await api.devices.locationList();
      const list = Array.isArray((res as any)?.devices) ? (res as any).devices : [];
      setDevices(
        list.map((d: any) => ({
          id: String(d.id),
          name: String(d.name ?? d.id),
          status: (d.status as any) ?? (d.is_online ? "online" : "offline"),
          latitude: d.latitude ?? null,
          longitude: d.longitude ?? null,
        })),
      );
    } catch (e) {
      console.error("Failed to load device locations", e);
      setDevices([]);
    }
  }

  async function refreshMapMarkers() {
    try {
      const map = mapRef.current;
      if (!map) return;

      const L = leafletRef.current;
      if (!L) return;

      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
      }

      const clusterGroup = L.markerClusterGroup();
      clusterGroupRef.current = clusterGroup;

      devices.forEach((d) => {
        if (d.latitude == null || d.longitude == null) return;

        const marker = L.marker([d.latitude, d.longitude]);
        marker.bindPopup(`
          <div class="device-popup">
            <div class="device-popup-title">${d.name ?? "Device"}</div>
            <div class="device-popup-status">${d.status ?? ""}</div>
          </div>
        `);
        clusterGroup.addLayer(marker);
      });

      clusterGroup.addTo(map);
    } catch (error) {
      console.error("MAP REFRESH ERROR:", error);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = await loadLeaflet({ css: true, cluster: true });
      if (cancelled) return;
      leafletRef.current = L;

      const map = L.map("device-map").setView([31.95, 35.91], 8);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      loadDevices();
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    refreshMapMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices]);

  return <div id="device-map" style={{ height: 520, width: "100%" }} />;
}
