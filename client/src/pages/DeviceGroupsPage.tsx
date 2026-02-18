import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  Edit,
  FolderOpen,
  Monitor,
  Upload,
  X,
  Loader2,
  Search,
  Users,
  Image as ImageIcon,
  Copy,
  Check,
  ChevronRight,
  ArrowLeft,
  Folder,
} from "lucide-react";

interface DeviceGroup {
  id: string;
  name: string;
  parent_id: string | null;
  icon_url: string | null;
  assigned_template: string | null;
  created_at: string;
  device_count?: number;
}

interface Device {
  id: string;
  device_id: string;
  name: string;
  location?: string;
  is_online?: boolean;
  group_id?: string;
}

interface GroupDevice {
  device_id: string;
  name: string;
  location?: string;
  status?: string;
}

export default function DeviceGroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [selectedGroup, setSelectedGroup] = useState<DeviceGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const iconInputRef = useRef<HTMLInputElement>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [detailGroup, setDetailGroup] = useState<DeviceGroup | null>(null);
  const [groupDevices, setGroupDevices] = useState<GroupDevice[]>([]);
  const [subgroups, setSubgroups] = useState<DeviceGroup[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showCreateSubgroupDialog, setShowCreateSubgroupDialog] = useState(false);
  const [newSubgroupName, setNewSubgroupName] = useState("");
  const [editingSubgroup, setEditingSubgroup] = useState<DeviceGroup | null>(null);
  const [showEditSubgroupDialog, setShowEditSubgroupDialog] = useState(false);
  const [showDeleteSubgroupDialog, setShowDeleteSubgroupDialog] = useState(false);
  const [subgroupToDelete, setSubgroupToDelete] = useState<DeviceGroup | null>(null);

  useEffect(() => {
    loadGroups();
    loadDevices();
  }, []);

  async function loadGroups() {
    try {
      const res = await fetch("/api/groups-with-counts");
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      } else {
        const fallbackRes = await fetch("/api/groups");
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          setGroups(data.map((g: DeviceGroup) => ({ ...g, device_count: 0 })));
        }
      }
    } catch (err) {
      console.error("Failed to load groups:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDevices() {
    try {
      const res = await fetch("/api/devices/list-full");
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch (err) {
      console.error("Failed to load devices:", err);
    }
  }

  async function openGroupDetail(group: DeviceGroup) {
    setDetailGroup(group);
    setShowDetailPanel(true);
    setLoadingDetail(true);
    
    try {
      const [devicesRes, subgroupsRes] = await Promise.all([
        fetch(`/api/groups/${group.id}/devices`),
        fetch(`/api/groups/${group.id}/subgroups`)
      ]);
      
      if (devicesRes.ok) {
        const devicesData = await devicesRes.json();
        setGroupDevices(devicesData);
      }
      
      if (subgroupsRes.ok) {
        const subgroupsData = await subgroupsRes.json();
        setSubgroups(subgroupsData);
      }
    } catch (err) {
      console.error("Failed to load group details:", err);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleRemoveDevice(deviceId: string) {
    if (!detailGroup) return;
    
    try {
      const res = await fetch(`/api/groups/${detailGroup.id}/devices/${deviceId}`, {
        method: "DELETE"
      });
      
      if (res.ok) {
        setGroupDevices(prev => prev.filter(d => d.device_id !== deviceId));
        loadGroups();
      }
    } catch (err) {
      console.error("Failed to remove device:", err);
    }
  }

  async function handleCreateSubgroup() {
    if (!detailGroup || !newSubgroupName.trim()) return;
    
    setSaving(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newSubgroupName,
          parentId: detailGroup.id
        })
      });
      
      if (res.ok) {
        const newGroup = await res.json();
        setSubgroups(prev => [...prev, { ...newGroup, device_count: 0 }]);
        setNewSubgroupName("");
        setShowCreateSubgroupDialog(false);
        loadGroups();
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
        body: JSON.stringify({ name: newSubgroupName })
      });
      
      if (res.ok) {
        setSubgroups(prev => prev.map(g => 
          g.id === editingSubgroup.id ? { ...g, name: newSubgroupName } : g
        ));
        setNewSubgroupName("");
        setEditingSubgroup(null);
        setShowEditSubgroupDialog(false);
        loadGroups();
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
        method: "DELETE"
      });
      
      if (res.ok) {
        setSubgroups(prev => prev.filter(g => g.id !== subgroupToDelete.id));
        setSubgroupToDelete(null);
        setShowDeleteSubgroupDialog(false);
        loadGroups();
      }
    } catch (err) {
      console.error("Failed to delete subgroup:", err);
    } finally {
      setSaving(false);
    }
  }

  function openEditSubgroupDialog(subgroup: DeviceGroup) {
    setEditingSubgroup(subgroup);
    setNewSubgroupName(subgroup.name);
    setShowEditSubgroupDialog(true);
  }

  function openDeleteSubgroupDialog(subgroup: DeviceGroup) {
    setSubgroupToDelete(subgroup);
    setShowDeleteSubgroupDialog(true);
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName }),
      });

      if (res.ok) {
        setShowCreateDialog(false);
        setNewGroupName("");
        loadGroups();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create group");
      }
    } catch (err) {
      console.error("Create group error:", err);
      alert("Failed to create group");
    } finally {
      setSaving(false);
    }
  }

  async function handleRenameGroup() {
    if (!selectedGroup || !newGroupName.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${selectedGroup.id}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName }),
      });

      if (res.ok) {
        setShowEditDialog(false);
        setSelectedGroup(null);
        setNewGroupName("");
        loadGroups();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to rename group");
      }
    } catch (err) {
      console.error("Rename group error:", err);
      alert("Failed to rename group");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup() {
    if (!selectedGroup) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${selectedGroup.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setShowDeleteDialog(false);
        setSelectedGroup(null);
        loadGroups();
      } else {
        alert("Failed to delete group");
      }
    } catch (err) {
      console.error("Delete group error:", err);
      alert("Failed to delete group");
    } finally {
      setSaving(false);
    }
  }

  async function handleIconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup) return;

    setUploadingIcon(true);
    try {
      const formData = new FormData();
      formData.append("icon", file);

      const res = await fetch(`/api/groups/${selectedGroup.id}/icon`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        loadGroups();
        const updated = await res.json();
        setSelectedGroup({ ...selectedGroup, icon_url: updated.iconUrl });
      } else {
        alert("Failed to upload icon");
      }
    } catch (err) {
      console.error("Icon upload error:", err);
      alert("Failed to upload icon");
    } finally {
      setUploadingIcon(false);
      if (iconInputRef.current) {
        iconInputRef.current.value = "";
      }
    }
  }

  async function handleClearIcon() {
    if (!selectedGroup) return;

    try {
      const res = await fetch(`/api/groups/${selectedGroup.id}/icon/clear`, {
        method: "POST",
      });

      if (res.ok) {
        loadGroups();
        setSelectedGroup({ ...selectedGroup, icon_url: null });
      }
    } catch (err) {
      console.error("Clear icon error:", err);
    }
  }

  async function handleAssignDevices() {
    if (!selectedGroup || selectedDevices.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${selectedGroup.id}/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceIds: selectedDevices }),
      });

      if (res.ok) {
        setShowAssignDialog(false);
        setSelectedDevices([]);
        loadGroups();
        loadDevices();
      } else {
        alert("Failed to assign devices");
      }
    } catch (err) {
      console.error("Assign devices error:", err);
      alert("Failed to assign devices");
    } finally {
      setSaving(false);
    }
  }

  function openEditDialog(group: DeviceGroup) {
    setSelectedGroup(group);
    setNewGroupName(group.name);
    setShowEditDialog(true);
  }

  function openAssignDialog(group: DeviceGroup) {
    setSelectedGroup(group);
    setSelectedDevices([]);
    setShowAssignDialog(true);
  }

  function openDeleteDialog(group: DeviceGroup) {
    setSelectedGroup(group);
    setShowDeleteDialog(true);
  }

  function toggleDeviceSelection(deviceId: string) {
    setSelectedDevices((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId]
    );
  }

  function selectAllDevices() {
    setSelectedDevices(devices.map((d) => d.device_id || d.id));
  }

  function deselectAllDevices() {
    setSelectedDevices([]);
  }

  const topLevelGroups = groups.filter((g) => !g.parent_id);
  const filteredGroups = topLevelGroups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Device Groups</h1>
          <p className="text-muted-foreground">
            Organize your devices into groups for easier management
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)} 
          data-testid="button-create-group"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-groups"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <FolderOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">No groups found</h3>
          <p className="text-muted-foreground mb-4">
            {search ? "Try a different search term" : "Create a group to organize your devices"}
          </p>
          {!search && (
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-group-empty">
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredGroups.map((group) => (
            <Card
              key={group.id}
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              data-testid={`group-card-${group.id}`}
              onClick={() => navigate(`/groups/${group.id}`)}
            >
              <div className="aspect-video bg-muted relative flex items-center justify-center">
                {group.icon_url ? (
                  <img
                    src={group.icon_url}
                    alt={group.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <FolderOpen className="w-16 h-16 text-muted-foreground/50" />
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <div className="px-2 py-1 bg-black/60 rounded text-xs text-white flex items-center gap-1">
                    <Monitor className="h-3 w-3" />
                    {group.device_count || 0}
                  </div>
                </div>
                <div className="absolute bottom-2 right-2">
                  <ChevronRight className="h-5 w-5 text-white bg-black/40 rounded-full p-0.5" />
                </div>
              </div>

              <div className="p-4">
                <h3
                  className="font-medium text-foreground truncate mb-2"
                  title={group.name}
                >
                  {group.name}
                </h3>

                <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openAssignDialog(group)}
                    data-testid={`button-assign-${group.id}`}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Assign
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(group)}
                    data-testid={`button-edit-${group.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openDeleteDialog(group)}
                    data-testid={`button-delete-${group.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a new group to organize your devices
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Group Name</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
                data-testid="input-group-name"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={saving || !newGroupName.trim()}
              data-testid="button-save-group"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Group"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Rename or update the group image
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Group Name</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
                data-testid="input-edit-group-name"
              />
            </div>

            <div>
              <Label>Group Image</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
                  {selectedGroup?.icon_url ? (
                    <img
                      src={selectedGroup.icon_url}
                      alt="Group icon"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIconUpload}
                    className="hidden"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => iconInputRef.current?.click()}
                    disabled={uploadingIcon}
                    data-testid="button-upload-icon"
                  >
                    {uploadingIcon ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Image
                      </>
                    )}
                  </Button>
                  {selectedGroup?.icon_url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleClearIcon}
                      data-testid="button-clear-icon"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove Image
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRenameGroup}
              disabled={saving || !newGroupName.trim()}
              data-testid="button-save-rename"
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

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Devices to {selectedGroup?.name}</DialogTitle>
            <DialogDescription>
              Select devices to add to this group. Devices can belong to multiple groups.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <Button size="sm" variant="outline" onClick={selectAllDevices}>
              Select All
            </Button>
            <Button size="sm" variant="outline" onClick={deselectAllDevices}>
              Deselect All
            </Button>
            <span className="ml-auto text-sm text-muted-foreground">
              {selectedDevices.length} selected
            </span>
          </div>

          <div className="flex-1 overflow-auto border rounded-lg">
            {devices.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No devices available
              </div>
            ) : (
              <div className="divide-y">
                {devices.map((device) => {
                  const deviceId = device.device_id || device.id;
                  const isSelected = selectedDevices.includes(deviceId);
                  return (
                    <label
                      key={deviceId}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        isSelected ? "bg-primary/10" : ""
                      }`}
                      data-testid={`device-row-${deviceId}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleDeviceSelection(deviceId)}
                      />
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{device.name || deviceId}</div>
                        {device.location && (
                          <div className="text-xs text-muted-foreground truncate">
                            {device.location}
                          </div>
                        )}
                      </div>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          device.is_online ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignDevices}
              disabled={saving || selectedDevices.length === 0}
              data-testid="button-confirm-assign"
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

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedGroup?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteGroup}
              disabled={saving}
              data-testid="button-confirm-delete"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailPanel} onOpenChange={setShowDetailPanel}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              {detailGroup?.name}
            </DialogTitle>
            <DialogDescription>
              Manage devices and subgroups in this group
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="devices" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="devices" data-testid="tab-devices">
                  <Monitor className="h-4 w-4 mr-2" />
                  Devices ({groupDevices.length})
                </TabsTrigger>
                <TabsTrigger value="subgroups" data-testid="tab-subgroups">
                  <Folder className="h-4 w-4 mr-2" />
                  Subgroups ({subgroups.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="devices" className="mt-4">
                {groupDevices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Monitor className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No devices assigned to this group</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setShowDetailPanel(false);
                        if (detailGroup) openAssignDialog(detailGroup);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Assign Devices
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {groupDevices.map((device) => (
                      <div
                        key={device.device_id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        data-testid={`detail-device-${device.device_id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{device.name || device.device_id}</div>
                            {device.location && (
                              <div className="text-xs text-muted-foreground">{device.location}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              device.status === "online" ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-100"
                            onClick={() => handleRemoveDevice(device.device_id)}
                            data-testid={`button-remove-device-${device.device_id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="subgroups" className="mt-4">
                <div className="flex justify-end mb-4">
                  <Button
                    size="sm"
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

                {subgroups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No subgroups in this group</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {subgroups.map((subgroup) => (
                      <div
                        key={subgroup.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        data-testid={`subgroup-${subgroup.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Folder className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{subgroup.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {subgroup.device_count || 0} devices
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditSubgroupDialog(subgroup)}
                            data-testid={`button-edit-subgroup-${subgroup.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-100"
                            onClick={() => openDeleteSubgroupDialog(subgroup)}
                            data-testid={`button-delete-subgroup-${subgroup.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateSubgroupDialog} onOpenChange={setShowCreateSubgroupDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle>Create Subgroup</DialogTitle>
            <DialogDescription>
              Create a new subgroup inside "{detailGroup?.name}"
            </DialogDescription>
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

      <Dialog open={showEditSubgroupDialog} onOpenChange={setShowEditSubgroupDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle>Edit Subgroup</DialogTitle>
            <DialogDescription>
              Rename the subgroup
            </DialogDescription>
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
              Are you sure you want to delete "{subgroupToDelete?.name}"? This action cannot be undone.
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
