import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  FolderOpen,
  Folder,
  Monitor,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronRight,
  Copy,
  Check,
  X,
  Home,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

interface DeviceGroup {
  id: string;
  name: string;
  icon_url?: string;
  parent_id?: string;
  device_count?: number;
  subgroup_count?: number;
}

interface Device {
  id: number;
  device_id: string;
  name: string;
  location?: string;
  status: string;
}

interface GroupDevice {
  device_id: string;
  name: string;
  location?: string;
  status: string;
  is_online?: boolean;
  temperature?: number | null;
  free_storage?: string | null;
  signal_strength?: number | null;
  last_seen?: string | null;
  current_content_id?: string | null;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<DeviceGroup | null>(null);
  const [subgroups, setSubgroups] = useState<DeviceGroup[]>([]);
  const [groupDevices, setGroupDevices] = useState<GroupDevice[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("subgroups");

  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showCreateSubgroupDialog, setShowCreateSubgroupDialog] = useState(false);
  const [showEditSubgroupDialog, setShowEditSubgroupDialog] = useState(false);
  const [showDeleteSubgroupDialog, setShowDeleteSubgroupDialog] = useState(false);
  const [newSubgroupName, setNewSubgroupName] = useState("");
  const [newSubgroupIcon, setNewSubgroupIcon] = useState<File | null>(null);
  const [newSubgroupIconPreview, setNewSubgroupIconPreview] = useState<string | null>(null);
  const [editSubgroupIcon, setEditSubgroupIcon] = useState<File | null>(null);
  const [editSubgroupIconPreview, setEditSubgroupIconPreview] = useState<string | null>(null);
  const [uploadingEditIcon, setUploadingEditIcon] = useState(false);
  const [editingSubgroup, setEditingSubgroup] = useState<DeviceGroup | null>(null);
  const [subgroupToDelete, setSubgroupToDelete] = useState<DeviceGroup | null>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const editIconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (groupId) {
      loadGroupData();
    }
  }, [groupId]);

  async function loadGroupData() {
    setLoading(true);
    try {
      const [groupRes, devicesRes, subgroupsRes, pathRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/groups/${groupId}/devices`),
        fetch(`/api/groups/${groupId}/subgroups`),
        fetch(`/api/groups/${groupId}/path`),
      ]);

      if (groupRes.ok) {
        const groupData = await groupRes.json();
        setGroup(groupData);
      }

      if (devicesRes.ok) {
        const devicesData = await devicesRes.json();
        setGroupDevices(devicesData);
      }

      if (subgroupsRes.ok) {
        const subgroupsData = await subgroupsRes.json();
        setSubgroups(subgroupsData);
      }

      if (pathRes.ok) {
        const pathData = await pathRes.json();
        setBreadcrumbs(pathData);
      }
    } catch (err) {
      console.error("Failed to load group data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAllDevices() {
    try {
      const res = await fetch("/api/devices/list-full");
      if (res.ok) {
        const data = await res.json();
        setAllDevices(data.devices || []);
      }
    } catch (err) {
      console.error("Failed to load devices:", err);
    }
  }

  async function handleRemoveDevice(deviceId: string) {
    try {
      const res = await fetch(`/api/groups/${groupId}/devices/${deviceId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setGroupDevices((prev) => prev.filter((d) => d.device_id !== deviceId));
      }
    } catch (err) {
      console.error("Failed to remove device:", err);
    }
  }

  async function handleAssignDevices() {
    if (selectedDevices.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceIds: selectedDevices }),
      });

      if (res.ok) {
        setShowAssignDialog(false);
        setSelectedDevices([]);
        loadGroupData();
      }
    } catch (err) {
      console.error("Failed to assign devices:", err);
    } finally {
      setSaving(false);
    }
  }

  function handleIconSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setNewSubgroupIcon(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewSubgroupIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function clearIconSelection() {
    setNewSubgroupIcon(null);
    setNewSubgroupIconPreview(null);
    if (iconInputRef.current) {
      iconInputRef.current.value = "";
    }
  }

  function handleEditIconSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setEditSubgroupIcon(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditSubgroupIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function clearEditIconSelection() {
    setEditSubgroupIcon(null);
    setEditSubgroupIconPreview(null);
    if (editIconInputRef.current) {
      editIconInputRef.current.value = "";
    }
  }

  async function handleUploadEditIcon() {
    if (!editSubgroupIcon || !editingSubgroup) return;

    setUploadingEditIcon(true);
    try {
      const formData = new FormData();
      formData.append("icon", editSubgroupIcon);

      const res = await fetch(`/api/groups/${editingSubgroup.id}/icon`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const iconData = await res.json();
        setSubgroups((prev) =>
          prev.map((s) =>
            s.id === editingSubgroup.id ? { ...s, icon_url: iconData.iconUrl } : s
          )
        );
        setEditingSubgroup({ ...editingSubgroup, icon_url: iconData.iconUrl });
        clearEditIconSelection();
      }
    } catch (err) {
      console.error("Failed to upload icon:", err);
    } finally {
      setUploadingEditIcon(false);
    }
  }

  async function handleCreateSubgroup() {
    if (!newSubgroupName.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSubgroupName,
          parentId: groupId,
        }),
      });

      if (res.ok) {
        const newGroup = await res.json();
        
        if (newSubgroupIcon) {
          const formData = new FormData();
          formData.append("icon", newSubgroupIcon);
          
          const iconRes = await fetch(`/api/groups/${newGroup.id}/icon`, {
            method: "POST",
            body: formData,
          });
          
          if (iconRes.ok) {
            const iconData = await iconRes.json();
            newGroup.icon_url = iconData.iconUrl;
          }
        }
        
        setSubgroups((prev) => [...prev, { ...newGroup, device_count: 0 }]);
        setNewSubgroupName("");
        clearIconSelection();
        setShowCreateSubgroupDialog(false);
      }
    } catch (err) {
      console.error("Failed to create subgroup:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSubgroup() {
    if (!editingSubgroup || !newSubgroupName.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${editingSubgroup.id}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubgroupName }),
      });

      if (res.ok) {
        let updatedIconUrl = editingSubgroup.icon_url;
        
        if (editSubgroupIcon) {
          const formData = new FormData();
          formData.append("icon", editSubgroupIcon);
          
          const iconRes = await fetch(`/api/groups/${editingSubgroup.id}/icon`, {
            method: "POST",
            body: formData,
          });
          
          if (iconRes.ok) {
            const iconData = await iconRes.json();
            updatedIconUrl = iconData.iconUrl;
          }
        }
        
        setSubgroups((prev) =>
          prev.map((g) =>
            g.id === editingSubgroup.id ? { ...g, name: newSubgroupName, icon_url: updatedIconUrl } : g
          )
        );
        setNewSubgroupName("");
        setEditingSubgroup(null);
        clearEditIconSelection();
        setShowEditSubgroupDialog(false);
      }
    } catch (err) {
      console.error("Failed to edit subgroup:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSubgroup() {
    if (!subgroupToDelete) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${subgroupToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSubgroups((prev) => prev.filter((g) => g.id !== subgroupToDelete.id));
        setSubgroupToDelete(null);
        setShowDeleteSubgroupDialog(false);
      }
    } catch (err) {
      console.error("Failed to delete subgroup:", err);
    } finally {
      setSaving(false);
    }
  }

  function openAssignDialog() {
    loadAllDevices();
    setSelectedDevices([]);
    setShowAssignDialog(true);
  }

  function toggleDeviceSelection(deviceId: string) {
    setSelectedDevices((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId]
    );
  }

  const filteredSubgroups = subgroups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredDevices = groupDevices.filter(
    (d) =>
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.device_id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-semibold text-foreground mb-2">Group not found</h2>
        <Button variant="outline" onClick={() => navigate("/groups")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Groups
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link
          to="/groups"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
          data-testid="breadcrumb-root"
        >
          <Home className="h-4 w-4" />
          Groups
        </Link>
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.id} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            {index === breadcrumbs.length - 1 ? (
              <span className="text-foreground font-medium">{crumb.name}</span>
            ) : (
              <Link
                to={`/groups/${crumb.id}`}
                className="hover:text-foreground transition-colors"
                data-testid={`breadcrumb-${crumb.id}`}
              >
                {crumb.name}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            {group.icon_url ? (
              <img
                src={group.icon_url}
                alt={group.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <FolderOpen className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{group.name}</h1>
            <p className="text-muted-foreground">
              {subgroups.length} subgroups • {groupDevices.length} devices
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={openAssignDialog} data-testid="button-assign-devices">
            <Copy className="h-4 w-4 mr-2" />
            Assign Devices
          </Button>
          <Button
            onClick={() => {
              setNewSubgroupName("");
              setShowCreateSubgroupDialog(true);
            }}
            data-testid="button-create-subgroup"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Subgroup
          </Button>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>

        {subgroups.length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="subgroups" data-testid="tab-subgroups">
                <Folder className="h-4 w-4 mr-2" />
                Subgroups ({subgroups.length})
              </TabsTrigger>
              <TabsTrigger value="devices" data-testid="tab-devices">
                <Monitor className="h-4 w-4 mr-2" />
                Devices ({groupDevices.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {subgroups.length > 0 && activeTab === "subgroups" && (
        <>
          {filteredSubgroups.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Folder className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No subgroups</h3>
              <p className="text-muted-foreground mb-4">
                Create a subgroup to organize devices within this group
              </p>
              <Button
                onClick={() => {
                  setNewSubgroupName("");
                  setShowCreateSubgroupDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Subgroup
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSubgroups.map((subgroup) => (
                <Card
                  key={subgroup.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  data-testid={`subgroup-card-${subgroup.id}`}
                  onClick={() => navigate(`/groups/${subgroup.id}`)}
                >
                  <div className="aspect-video bg-muted relative flex items-center justify-center">
                    {subgroup.icon_url ? (
                      <img
                        src={subgroup.icon_url}
                        alt={subgroup.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Folder className="w-16 h-16 text-muted-foreground/50" />
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {(subgroup.subgroup_count || 0) > 0 && (
                        <div className="px-2 py-1 bg-black/60 rounded text-xs text-white flex items-center gap-1">
                          <Folder className="h-3 w-3" />
                          {subgroup.subgroup_count}
                        </div>
                      )}
                      <div className="px-2 py-1 bg-black/60 rounded text-xs text-white flex items-center gap-1">
                        <Monitor className="h-3 w-3" />
                        {subgroup.device_count || 0}
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <ChevronRight className="h-5 w-5 text-white bg-black/40 rounded-full p-0.5" />
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-medium text-foreground truncate mb-2" title={subgroup.name}>
                      {subgroup.name}
                    </h3>

                    <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingSubgroup(subgroup);
                          setNewSubgroupName(subgroup.name);
                          setShowEditSubgroupDialog(true);
                        }}
                        data-testid={`button-edit-subgroup-${subgroup.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSubgroupToDelete(subgroup);
                          setShowDeleteSubgroupDialog(true);
                        }}
                        data-testid={`button-delete-subgroup-${subgroup.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {(subgroups.length === 0 || activeTab === "devices") && (
        <>
          {filteredDevices.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Monitor className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No devices</h3>
              <p className="text-muted-foreground mb-4">
                Assign devices to this group
              </p>
              <Button onClick={openAssignDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Assign Devices
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDevices.map((device) => (
                <div
                  key={device.device_id}
                  className="bg-white p-4 rounded-xl shadow border border-[#e0ddd5] cursor-pointer hover:shadow-lg transition"
                  onClick={() => navigate(`/devices/${device.device_id}`)}
                  data-testid={`device-card-${device.device_id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="font-semibold text-[#3d3d3d]">
                      {device.name || device.device_id}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-100 -mt-1 -mr-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveDevice(device.device_id);
                      }}
                      data-testid={`button-remove-device-${device.device_id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="text-xs text-[#6b6b6b]">
                    Location: {device.location || "Unknown"}
                  </div>

                  <div className="mt-2 text-sm">
                    <span className={device.is_online || device.status === "online" ? "text-[#5b7a5b]" : "text-[#b5836d]"}>
                      ● {device.is_online || device.status === "online" ? "Online" : "Offline"}
                    </span>
                  </div>

                  <div className="text-xs text-[#6b6b6b] mt-1">
                    Status: {device.status}
                  </div>

                  <div className="text-xs text-[#6b6b6b]">
                    Content: {device.current_content_id || "—"}
                  </div>

                  <div className="text-xs text-[#6b6b6b]">
                    Signal: {device.signal_strength ?? "—"} dBm
                  </div>

                  <div className="text-xs text-[#6b6b6b]">
                    Free Storage:{" "}
                    {device.free_storage
                      ? (parseInt(device.free_storage) / 1024 / 1024).toFixed(1) + " MB"
                      : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Devices to {group.name}</DialogTitle>
            <DialogDescription>
              Select devices to add to this group
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedDevices(allDevices.map((d) => d.device_id || d.id.toString()))}
              >
                Select All
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedDevices([])}>
                Deselect All
              </Button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allDevices.map((device) => {
                const deviceId = device.device_id || device.id.toString();
                const isAssigned = groupDevices.some((gd) => gd.device_id === deviceId);

                return (
                  <div
                    key={deviceId}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isAssigned ? "bg-muted/50 opacity-60" : "hover:bg-muted/30"
                    }`}
                  >
                    <Checkbox
                      checked={selectedDevices.includes(deviceId)}
                      onCheckedChange={() => toggleDeviceSelection(deviceId)}
                      disabled={isAssigned}
                    />
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{device.name || deviceId}</div>
                      {device.location && (
                        <div className="text-xs text-muted-foreground">{device.location}</div>
                      )}
                    </div>
                    {isAssigned && (
                      <span className="text-xs text-muted-foreground">Already assigned</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignDevices}
              disabled={saving || selectedDevices.length === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Assign {selectedDevices.length} Device{selectedDevices.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateSubgroupDialog} onOpenChange={(open) => {
        setShowCreateSubgroupDialog(open);
        if (!open) clearIconSelection();
      }}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle>Create Subgroup</DialogTitle>
            <DialogDescription>Create a new subgroup inside "{group.name}"</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Subgroup Name</Label>
              <Input
                value={newSubgroupName}
                onChange={(e) => setNewSubgroupName(e.target.value)}
                placeholder="Enter subgroup name"
                data-testid="input-subgroup-name"
              />
            </div>
            
            <div>
              <Label>Thumbnail Image (optional)</Label>
              <div className="mt-2 flex items-center gap-4">
                {newSubgroupIconPreview ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                    <img
                      src={newSubgroupIconPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={clearIconSelection}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-slate-400" />
                  </div>
                )}
                <div>
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIconSelect}
                    className="hidden"
                    data-testid="input-subgroup-icon"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => iconInputRef.current?.click()}
                    data-testid="button-select-icon"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {newSubgroupIconPreview ? "Change Image" : "Select Image"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSubgroupDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubgroup}
              disabled={saving || !newSubgroupName.trim()}
              data-testid="button-save-subgroup"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Subgroup"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditSubgroupDialog} onOpenChange={(open) => {
        setShowEditSubgroupDialog(open);
        if (!open) clearEditIconSelection();
      }}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle>Edit Subgroup</DialogTitle>
            <DialogDescription>Edit the subgroup name and thumbnail</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Subgroup Name</Label>
              <Input
                value={newSubgroupName}
                onChange={(e) => setNewSubgroupName(e.target.value)}
                placeholder="Enter subgroup name"
                data-testid="input-edit-subgroup-name"
              />
            </div>

            <div>
              <Label>Thumbnail Image</Label>
              <div className="mt-2 flex items-center gap-4">
                {editSubgroupIconPreview || editingSubgroup?.icon_url ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                    <img
                      src={editSubgroupIconPreview || editingSubgroup?.icon_url || ""}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    {editSubgroupIconPreview && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={clearEditIconSelection}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-slate-400" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <input
                    ref={editIconInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleEditIconSelect}
                    className="hidden"
                    data-testid="input-edit-subgroup-icon"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editIconInputRef.current?.click()}
                    data-testid="button-select-edit-icon"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {editingSubgroup?.icon_url || editSubgroupIconPreview ? "Change Image" : "Select Image"}
                  </Button>
                  {editSubgroupIcon && (
                    <p className="text-xs text-muted-foreground">Image will be uploaded when you save</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditSubgroupDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSubgroup}
              disabled={saving || !newSubgroupName.trim()}
              data-testid="button-update-subgroup"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteSubgroupDialog} onOpenChange={setShowDeleteSubgroupDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle>Delete Subgroup</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{subgroupToDelete?.name}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteSubgroupDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSubgroup}
              disabled={saving}
              data-testid="button-confirm-delete-subgroup"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Subgroup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
