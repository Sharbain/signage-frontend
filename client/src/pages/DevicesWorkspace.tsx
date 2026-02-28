import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loadLeaflet } from "../lib/loadLeaflet";
import "../styles/device-popup.css";
import { Trash2, Plus, ChevronRight, ChevronDown, Folder, FolderOpen, Monitor, Search, Map } from "lucide-react";

/**
 * NOTE:
 * - Leaflet + markercluster + CSS are now loaded dynamically via loadLeaflet()
 * - This prevents Leaflet from being bundled into your main chunk.
 */

interface Device {
  id: string;
  name: string;
  status: "online" | "recently_offline" | "offline";
  group_id?: string | null;
  latitude: number | null;
  longitude: number | null;
  client_id?: string | null;
}

interface Group {
  id: string;
  name: string;
  parent_id?: string | null;
  client_id?: string | null;
}

export default function DevicesWorkspace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [devices, setDevices] = useState<Device[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [showMap, setShowMap] = useState(false);
  const [mapDevices, setMapDevices] = useState<Device[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const clusterGroupRef = useRef<any>(null);

  // (keep your existing fetch logic; this file preserves your structure)
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // your existing API calls here...
        // setDevices(...)
        // setGroups(...)
        // setMapDevices(...)
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Initialize map lazily (Leaflet loads here only)
  useEffect(() => {
    if (!showMap) return;
    if (!mapContainerRef.current || mapRef.current) return;

    let cancelled = false;

    (async () => {
      const L = await loadLeaflet({ css: true, cluster: true });
      if (cancelled) return;
      leafletRef.current = L;

      const map = L.map(mapContainerRef.current).setView([31.95, 35.91], 8);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [showMap]);

  // Refresh markers when mapDevices/filters change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const L = leafletRef.current;
    if (!L) return;

    // clear old
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
    }

    const clusterGroup = L.markerClusterGroup();
    clusterGroupRef.current = clusterGroup;

    const filteredMapDevices = selectedGroupId
      ? mapDevices.filter((d) => d.group_id === selectedGroupId)
      : mapDevices;

    filteredMapDevices.forEach((d) => {
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
  }, [mapDevices, selectedGroupId]);

  // ----- UI -----
  // Keep your existing UI below; only map plumbing was changed.
  // If your file contains more UI code, keep it as-is.
  return (
    <div className="p-6">
      {/* your existing UI */}
      <div className="flex items-center gap-2 mb-4">
        <button
          className="px-3 py-2 rounded bg-white border"
          onClick={() => setShowMap((v) => !v)}
        >
          <span className="inline-flex items-center gap-2">
            <Map className="w-4 h-4" />
            {showMap ? "Hide Map" : "Show Map"}
          </span>
        </button>

        <div className="flex-1" />

        <div className="relative w-[320px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded border bg-white"
            placeholder="Search devices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {showMap && (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <div ref={mapContainerRef} style={{ height: 520, width: "100%" }} />
        </div>
      )}

      {/* rest of your original list/tree UI */}
    </div>
  );
}
