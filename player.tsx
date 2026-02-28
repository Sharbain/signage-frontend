import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "../styles/device-popup.css";
import { Trash2, Plus, ChevronRight, ChevronDown, Folder, FolderOpen, Monitor, Search, MapPin, List, Edit, FolderPlus, Move, Scissors } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeviceGroup {
  id: string;
  name: string;
  parent_id: string | null;
  device_count?: number;
  children?: DeviceGroup[];
}

interface Device {
  id: string;
  name: string;
  location_branch?: string;
  is_online: boolean;
  last_seen: string | null;
  status: string;
  current_content_id?: string | null;
  signal_strength?: number | null;
  free_storage?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  errors: string[];
  group_id?: string | null;
}

interface MapDevice {
  id: string;
  name: string;
  status: "online" | "recently_offline" | "offline";
  latitude: number | null;
  longitude: number | null;
  lastHeartbeat?: string | null;
  thumbnail?: string | null;
  group_id?: string | null;
  locationName?: string | null;
}

function renderPopupHTML(device: MapDevice) {
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
      ${device.locationName ? `<div class="popup-line"><strong>Location:</strong> ${device.locationName}</div>` : ""}
      <button class="popup-btn" onclick="window.location.href='/devices/${device.id}'">
        Open Device Control
      </button>
    </div>
  `;
}

function createMarkerIcon(status: string) {
  const colorMap: Record<string, string> = {
    online: "#22c55e",
    recently_offline: "#eab308",
    offline: "#ef4444",
  };
  
  const color = colorMap[status] || colorMap.offline;
  const pulseClass = status === "recently_offline" ? "pulse-dot" : "";
  
  return L.divIcon({
    html: `<div class="${pulseClass}" style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
    className: "custom-dot-marker",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

function GroupTreeItem({ 
  group, 
  level, 
  selectedGroupId, 
  onSelect, 
  expandedGroups, 
  toggleExpand,
  onContextMenu
}: { 
  group: DeviceGroup; 
  level: number; 
  selectedGroupId: string | null;
  onSelect: (id: string | null) => void;
  expandedGroups: Set<string>;
  toggleExpand: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, group: DeviceGroup) => void;
}) {
  const isExpanded = expandedGroups.has(group.id);
  const hasChildren = group.children && group.children.length > 0;
  const isSelected = selectedGroupId === group.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-2 cursor-pointer rounded transition hover:bg-[#e8e6df] ${
          isSelected ? "bg-[#5b7a5b]/10 border-l-2 border-[#5b7a5b]" : ""
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(group.id)}
        onContextMenu={(e) => onContextMenu(e, group)}
        data-testid={`group-tree-${group.id}`}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(group.id);
            }}
            className="p-0.5 hover:bg-[#d0cdc5] rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-[#6b6b6b]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#6b6b6b]" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        
        {isExpanded || isSelected ? (
          <FolderOpen className="w-4 h-4 text-[#5b7a5b]" />
        ) : (
          <Folder className="w-4 h-4 text-[#8b8b7a]" />
        )}
        
        <span className="flex-1 text-sm text-[#3d3d3d] truncate">{group.name}</span>
        
        <span className="text-xs text-[#8b8b7a] bg-[#e8e6df] px-1.5 py-0.5 rounded">
          {group.device_count || 0}
        </span>
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {group.children!.map((child) => (
            <GroupTreeItem
              key={child.id}
              group={child}
              level={level + 1}
              selectedGroupId={selectedGroupId}
              onSelect={onSelect}
              expandedGroups={expandedGroups}
              toggleExpand={toggleExpand}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DevicesWorkspace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [mapDevices, setMapDevices] = useState<MapDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; group: DeviceGroup | null } | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contextGroup, setContextGroup] = useState<DeviceGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [parentGroupId, setParentGroupId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [deviceContextMenu, setDeviceContextMenu] = useState<{ x: number; y: number; device: Device } | null>(null);
  const [showEditDeviceDialog, setShowEditDeviceDialog] = useState(false);
  const [showMoveDeviceDialog, setShowMoveDeviceDialog] = useState(false);
  const [showDeleteDeviceDialog, setShowDeleteDeviceDialog] = useState(false);
  const [contextDevice, setContextDevice] = useState<Device | null>(null);
  const [editDeviceName, setEditDeviceName] = useState("");
  const [editDeviceLocation, setEditDeviceLocation] = useState("");
  const [moveTargetGroupId, setMoveTargetGroupId] = useState<string | null>(null);
  
  const [rootFolderName, setRootFolderName] = useState(() => localStorage.getItem("rootFolderName") || "Home");
  const [rootContextMenu, setRootContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showRenameRootDialog, setShowRenameRootDialog] = useState(false);
  const [newRootName, setNewRootName] = useState("");
  
  const selectedGroupId = searchParams.get("group");
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  const setSelectedGroupId = (id: string | null) => {
    if (id) {
      setSearchParams({ group: id });
    } else {
      setSearchParams({});
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleDeviceSelection = (e: React.MouseEvent, deviceId: string) => {
    e.stopPropagation();
    setSelectedDevices((prev) => {
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
      for (const id of deviceIds) {
        await fetch(`/api/screens/${id}`, { method: "DELETE" });
      }
      setDevices(devices.filter((d) => !selectedDevices.has(d.id)));
      setSelectedDevices(new Set());
      window.dispatchEvent(new CustomEvent("devicesChanged"));
    } catch (err) {
      console.error("Failed to remove devices:", err);
    }
  };

  function buildGroupTree(flatGroups: DeviceGroup[]): DeviceGroup[] {
    const map = new Map<string, DeviceGroup>();
    const roots: DeviceGroup[] = [];

    flatGroups.forEach((g) => {
      map.set(g.id, { ...g, children: [] });
    });

    flatGroups.forEach((g) => {
      const node = map.get(g.id)!;
      if (g.parent_id && map.has(g.parent_id)) {
        map.get(g.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async function loadGroups() {
    try {
      const res = await fetch("/api/groups-with-counts");
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (err) {
      console.error("Failed to load groups:", err);
    }
  }

  const handleContextMenu = (e: React.MouseEvent, group: DeviceGroup) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, group });
  };

  const handleExplorerContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, group: null });
  };

  const closeContextMenu = () => setContextMenu(null);
  const closeDeviceContextMenu = () => setDeviceContextMenu(null);
  const closeRootContextMenu = () => setRootContextMenu(null);

  const handleRootContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRootContextMenu({ x: e.clientX, y: e.clientY });
  };

  const openRenameRootDialog = () => {
    setNewRootName(rootFolderName);
    setShowRenameRootDialog(true);
    closeRootContextMenu();
  };

  const handleRenameRoot = () => {
    if (newRootName.trim()) {
      setRootFolderName(newRootName.trim());
      localStorage.setItem("rootFolderName", newRootName.trim());
    }
    setShowRenameRootDialog(false);
  };

  const handleDeviceContextMenu = (e: React.MouseEvent, device: Device) => {
    e.preventDefault();
    e.stopPropagation();
    setDeviceContextMenu({ x: e.clientX, y: e.clientY, device });
  };

  const openEditDeviceDialog = (device: Device) => {
    setContextDevice(device);
    setEditDeviceName(device.name || "");
    setEditDeviceLocation(device.location_branch || "");
    setShowEditDeviceDialog(true);
    closeDeviceContextMenu();
  };

  const openMoveDeviceDialog = (device: Device) => {
    setContextDevice(device);
    setMoveTargetGroupId(device.group_id || null);
    setShowMoveDeviceDialog(true);
    closeDeviceContextMenu();
  };

  const openDeleteDeviceDialog = (device: Device) => {
    setContextDevice(device);
    setShowDeleteDeviceDialog(true);
    closeDeviceContextMenu();
  };

  const handleEditDevice = async () => {
    if (!contextDevice) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/screens/${contextDevice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editDeviceName, location: editDeviceLocation }),
      });
      if (res.ok) {
        setDevices(devices.map(d => 
          d.id === contextDevice.id 
            ? { ...d, name: editDeviceName, location_branch: editDeviceLocation } 
            : d
        ));
        setShowEditDeviceDialog(false);
        setContextDevice(null);
      }
    } catch (err) {
      console.error("Failed to update device:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleMoveDevice = async () => {
    if (!contextDevice) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/screens/${contextDevice.id}/group`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: moveTargetGroupId }),
      });
      if (res.ok) {
        setDevices(devices.map(d => 
          d.id === contextDevice.id 
            ? { ...d, group_id: moveTargetGroupId } 
            : d
        ));
        setShowMoveDeviceDialog(false);
        setContextDevice(null);
        loadGroups();
      }
    } catch (err) {
      console.error("Failed to move device:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDevice = async () => {
    if (!contextDevice) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/screens/${contextDevice.id}`, { method: "DELETE" });
      if (res.ok) {
        setDevices(devices.filter(d => d.id !== contextDevice.id));
        setShowDeleteDeviceDialog(false);
        setContextDevice(null);
        window.dispatchEvent(new CustomEvent("devicesChanged"));
      }
    } catch (err) {
      console.error("Failed to delete device:", err);
    } finally {
      setSaving(false);
    }
  };

  const openCreateDialog = (parentId: string | null = null) => {
    setParentGroupId(parentId);
    setNewGroupName("");
    setShowCreateDialog(true);
    closeContextMenu();
  };

  const openEditDialog = (group: DeviceGroup) => {
    setContextGroup(group);
    setNewGroupName(group.name);
    setShowEditDialog(true);
    closeContextMenu();
  };

  const openDeleteDialog = (group: DeviceGroup) => {
    setContextGroup(group);
    setShowDeleteDialog(true);
    closeContextMenu();
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName, parentId: parentGroupId }),
      });
      if (res.ok) {
        setShowCreateDialog(false);
        setNewGroupName("");
        loadGroups();
      }
    } catch (err) {
      console.error("Failed to create group:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleEditGroup = async () => {
    if (!contextGroup || !newGroupName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${contextGroup.id}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName }),
      });
      if (res.ok) {
        setShowEditDialog(false);
        setContextGroup(null);
        setNewGroupName("");
        loadGroups();
      }
    } catch (err) {
      console.error("Failed to rename group:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!contextGroup) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${contextGroup.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShowDeleteDialog(false);
        setContextGroup(null);
        if (selectedGroupId === contextGroup.id) {
          setSelectedGroupId(null);
        }
        loadGroups();
      }
    } catch (err) {
      console.error("Failed to delete group:", err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handleClick = () => {
      closeContextMenu();
      closeDeviceContextMenu();
      closeRootContextMenu();
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [groupsRes, devicesRes, mapRes] = await Promise.all([
          fetch("/api/groups-with-counts"),
          fetch("/api/devices/list-full"),
          fetch("/api/devices/locations"),
        ]);

        if (groupsRes.ok) {
          const data = await groupsRes.json();
          setGroups(data);
        }

        if (devicesRes.ok) {
          const data = await devicesRes.json();
          setDevices(data.devices || []);
        }

        if (mapRes.ok) {
          const data = await mapRes.json();
          setMapDevices(Array.isArray(data) ? data : data.devices || []);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([31.95, 35.91], 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
    }

    const clusterGroup = L.markerClusterGroup();
    clusterGroupRef.current = clusterGroup;

    const filteredMapDevices = selectedGroupId
      ? mapDevices.filter((d) => d.group_id === selectedGroupId)
      : mapDevices;

    filteredMapDevices.forEach((device) => {
      if (!device.latitude || !device.longitude) return;

      const marker = L.marker([device.latitude, device.longitude], {
        icon: createMarkerIcon(device.status),
      });

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
  }, [mapDevices, devices, selectedGroupId]);

  const groupTree = buildGroupTree(groups);

  const filteredDevices = devices.filter((d) => {
    const matchesSearch = `${d.name} ${d.id} ${d.location_branch ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = !selectedGroupId || d.group_id === selectedGroupId;
    return matchesSearch && matchesGroup;
  });

  const selectedGroupName = selectedGroupId ? groups.find((g) => g.id === selectedGroupId)?.name : null;

  return (
    <div className="flex h-[calc(100vh-2rem)]">
      <div className="w-64 bg-[#f5f4f0] border-r border-[#e0ddd5] flex flex-col">
        <div className="p-4 border-b border-[#e0ddd5]">
          <h2 className="text-lg font-semibold text-[#3d3d3d] flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#5b7a5b]" />
            Device Groups
          </h2>
        </div>
        
        <div 
          className="flex-1 overflow-y-auto p-2"
          onContextMenu={handleExplorerContextMenu}
        >
          <div
            className={`flex items-center gap-2 py-2 pr-2 pl-4 cursor-pointer rounded transition hover:bg-[#e8e6df] ${
              !selectedGroupId ? "bg-[#5b7a5b]/10 border-l-2 border-[#5b7a5b]" : ""
            }`}
            onClick={() => setSelectedGroupId(null)}
            onContextMenu={handleRootContextMenu}
            data-testid="group-tree-all"
          >
            <Folder className="w-4 h-4 text-[#5b7a5b]" />
            <span className="flex-1 text-sm text-[#3d3d3d]">{rootFolderName}</span>
            <span className="text-xs text-[#8b8b7a] bg-[#e8e6df] px-1.5 py-0.5 rounded">
              {devices.length}
            </span>
          </div>
          
          {groupTree.map((group) => (
            <GroupTreeItem
              key={group.id}
              group={group}
              level={0}
              selectedGroupId={selectedGroupId}
              onSelect={setSelectedGroupId}
              expandedGroups={expandedGroups}
              toggleExpand={toggleExpand}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>
        
        <div className="p-3 border-t border-[#e0ddd5]">
          <button
            onClick={() => openCreateDialog(null)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm bg-[#5b7a5b] text-white rounded hover:bg-[#4a6349] transition"
            data-testid="button-new-group"
          >
            <Plus className="w-4 h-4" />
            New Group
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-64 border-b border-[#e0ddd5] relative">
          <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-[#5b7a5b]" />
            <span className="text-[#3d3d3d] font-medium">Device Map</span>
            {selectedGroupName && (
              <span className="text-[#6b6b6b]">— {selectedGroupName}</span>
            )}
          </div>
          
          <div className="absolute top-3 right-3 z-[1000] flex gap-3 text-xs bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
              Online
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
              Status
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              Offline
            </span>
          </div>
          
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <List className="w-5 h-5 text-[#5b7a5b]" />
              <h2 className="text-xl font-semibold text-[#3d3d3d]">
                {selectedGroupName || rootFolderName}
              </h2>
              <span className="text-sm text-[#6b6b6b]">
                ({filteredDevices.length} devices)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b8b7a]" />
              <input
                className="w-full pl-10 pr-4 py-2 border border-[#e0ddd5] rounded bg-white text-[#3d3d3d] focus:outline-none focus:border-[#5b7a5b]"
                placeholder="Search devices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-devices"
              />
            </div>

            <button
              className="bg-[#5b7a5b] text-white px-4 py-2 rounded shadow hover:bg-[#4a6349] transition"
              onClick={() => navigate("/devices/add")}
              data-testid="button-add-device"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Add Device
            </button>

            <button
              onClick={handleRemoveDevices}
              disabled={selectedDevices.size === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded shadow transition ${
                selectedDevices.size > 0
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

          {!loading && filteredDevices.length === 0 && (
            <div className="text-[#6b6b6b]">
              {search ? "No devices match your search." : "No devices found. Add your first device."}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDevices.map((d) => (
              <div
                key={d.id}
                className={`bg-white p-4 rounded-xl shadow border cursor-pointer hover:shadow-lg transition ${
                  selectedDevices.has(d.id) ? "border-[#5b7a5b] ring-2 ring-[#5b7a5b]/20" : "border-[#e0ddd5]"
                }`}
                onClick={() => navigate(`/devices/${d.id}`)}
                onContextMenu={(e) => handleDeviceContextMenu(e, d)}
                data-testid={`card-device-${d.id}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedDevices.has(d.id)}
                    onClick={(e) => toggleDeviceSelection(e, d.id)}
                    onChange={() => {}}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-[#5b7a5b] focus:ring-[#5b7a5b]"
                    data-testid={`checkbox-device-${d.id}`}
                  />
                  <div className="font-semibold text-[#3d3d3d]">{d.name}</div>
                </div>

                <div className="text-xs text-[#6b6b6b]">
                  Location: {d.location_branch || "Unknown"}
                </div>

                <div className="mt-2 text-sm">
                  <span className={d.is_online ? "text-[#5b7a5b]" : "text-[#b5836d]"}>
                    ● {d.is_online ? "Online" : "Offline"}
                  </span>
                </div>

                <div className="text-xs text-[#6b6b6b] mt-1">Status: {d.status}</div>
                <div className="text-xs text-[#6b6b6b]">Content: {d.current_content_id || "—"}</div>
                <div className="text-xs text-[#6b6b6b]">Signal: {d.signal_strength ?? "—"} dBm</div>
                <div className="text-xs text-[#6b6b6b]">
                  Free Storage: {d.free_storage ? (d.free_storage / 1024 / 1024).toFixed(1) + " MB" : "—"}
                </div>

                {d.errors?.length > 0 && (
                  <div className="text-xs text-[#c9534a] mt-2">Errors: {d.errors.join(", ")}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {contextMenu && (
        <div
          className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-[#e0ddd5] py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-2 text-left text-sm text-[#3d3d3d] hover:bg-[#f5f4f0] flex items-center gap-2"
            onClick={() => openCreateDialog(null)}
            data-testid="context-add-group"
          >
            <FolderPlus className="w-4 h-4" />
            New Group
          </button>
          {contextMenu.group && (
            <>
              <button
                className="w-full px-3 py-2 text-left text-sm text-[#3d3d3d] hover:bg-[#f5f4f0] flex items-center gap-2"
                onClick={() => openCreateDialog(contextMenu.group!.id)}
                data-testid="context-add-subgroup"
              >
                <FolderPlus className="w-4 h-4" />
                Add Subgroup
              </button>
              <div className="border-t border-[#e0ddd5] my-1" />
              <button
                className="w-full px-3 py-2 text-left text-sm text-[#3d3d3d] hover:bg-[#f5f4f0] flex items-center gap-2"
                onClick={() => openEditDialog(contextMenu.group!)}
                data-testid="context-edit-group"
              >
                <Edit className="w-4 h-4" />
                Edit Group
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm text-[#c9534a] hover:bg-[#fef2f2] flex items-center gap-2"
                onClick={() => openDeleteDialog(contextMenu.group!)}
                data-testid="context-delete-group"
              >
                <Trash2 className="w-4 h-4" />
                Delete Group
              </button>
            </>
          )}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{parentGroupId ? "Create Subgroup" : "Create New Group"}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Group Name</Label>
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter group name"
              className="mt-2"
              data-testid="input-new-group-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateGroup} disabled={saving || !newGroupName.trim()}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Group Name</Label>
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter group name"
              className="mt-2"
              data-testid="input-edit-group-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEditGroup} disabled={saving || !newGroupName.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-[#6b6b6b]">
            Are you sure you want to delete "{contextGroup?.name}"? This action cannot be undone.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteGroup} disabled={saving}>
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {deviceContextMenu && (
        <div
          className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-[#e0ddd5] py-1 min-w-[160px]"
          style={{ left: deviceContextMenu.x, top: deviceContextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-2 text-left text-sm text-[#3d3d3d] hover:bg-[#f5f4f0] flex items-center gap-2"
            onClick={() => openEditDeviceDialog(deviceContextMenu.device)}
            data-testid="context-edit-device"
          >
            <Edit className="w-4 h-4" />
            Edit Device
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm text-[#3d3d3d] hover:bg-[#f5f4f0] flex items-center gap-2"
            onClick={() => openMoveDeviceDialog(deviceContextMenu.device)}
            data-testid="context-move-device"
          >
            <Move className="w-4 h-4" />
            Move to Group
          </button>
          <div className="border-t border-[#e0ddd5] my-1" />
          <button
            className="w-full px-3 py-2 text-left text-sm text-[#c9534a] hover:bg-[#fef2f2] flex items-center gap-2"
            onClick={() => openDeleteDeviceDialog(deviceContextMenu.device)}
            data-testid="context-delete-device"
          >
            <Trash2 className="w-4 h-4" />
            Delete Device
          </button>
        </div>
      )}

      <Dialog open={showEditDeviceDialog} onOpenChange={setShowEditDeviceDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Device Name</Label>
              <Input
                value={editDeviceName}
                onChange={(e) => setEditDeviceName(e.target.value)}
                placeholder="Enter device name"
                className="mt-2"
                data-testid="input-edit-device-name"
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={editDeviceLocation}
                onChange={(e) => setEditDeviceLocation(e.target.value)}
                placeholder="Enter location"
                className="mt-2"
                data-testid="input-edit-device-location"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDeviceDialog(false)}>Cancel</Button>
            <Button onClick={handleEditDevice} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMoveDeviceDialog} onOpenChange={setShowMoveDeviceDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Move Device to Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Select Group</Label>
            <select
              value={moveTargetGroupId || ""}
              onChange={(e) => setMoveTargetGroupId(e.target.value || null)}
              className="w-full mt-2 px-3 py-2 border border-[#e0ddd5] rounded bg-white text-[#3d3d3d] focus:outline-none focus:border-[#5b7a5b]"
              data-testid="select-move-device-group"
            >
              <option value="">No Group (Ungrouped)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDeviceDialog(false)}>Cancel</Button>
            <Button onClick={handleMoveDevice} disabled={saving}>
              {saving ? "Moving..." : "Move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDeviceDialog} onOpenChange={setShowDeleteDeviceDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Delete Device</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-[#6b6b6b]">
            Are you sure you want to delete "{contextDevice?.name || contextDevice?.id}"? This action cannot be undone.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDeviceDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteDevice} disabled={saving}>
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {rootContextMenu && (
        <div
          className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-[#e0ddd5] py-1 min-w-[160px]"
          style={{ left: rootContextMenu.x, top: rootContextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-2 text-left text-sm text-[#3d3d3d] hover:bg-[#f5f4f0] flex items-center gap-2"
            onClick={openRenameRootDialog}
            data-testid="context-rename-root"
          >
            <Edit className="w-4 h-4" />
            Rename
          </button>
        </div>
      )}

      <Dialog open={showRenameRootDialog} onOpenChange={setShowRenameRootDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Rename Root Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Folder Name</Label>
            <Input
              value={newRootName}
              onChange={(e) => setNewRootName(e.target.value)}
              placeholder="Enter folder name"
              className="mt-2"
              data-testid="input-rename-root"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameRootDialog(false)}>Cancel</Button>
            <Button onClick={handleRenameRoot} disabled={!newRootName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
