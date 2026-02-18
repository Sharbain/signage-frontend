import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Trash2, Send, Image as ImageIcon, Film, X, Loader2 } from "lucide-react";

interface MediaItem {
  id: number;
  name: string;
  type: string;
  url: string;
  size?: number;
  duration?: number;
  uploadedAt?: string;
}

interface Device {
  id: string;
  name: string;
  location_branch?: string;
  is_online?: boolean;
}

interface DeviceGroup {
  id: string;
  name: string;
  device_count?: number;
}

export default function Media() {
  const navigate = useNavigate();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [pushTarget, setPushTarget] = useState<"device" | "group">("device");
  const [pushing, setPushing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadMedia() {
    try {
      const res = await fetch("/api/media");
      if (res.ok) {
        const data = await res.json();
        setMedia(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load media:", err);
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

  async function loadGroups() {
    try {
      const res = await fetch("/api/device-groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load groups:", err);
    }
  }

  useEffect(() => {
    loadMedia();
    loadDevices();
    loadGroups();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("accessToken") || "";
      const res = await fetch("/api/media/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (res.ok) {
        loadMedia();
      } else {
        const err = await res.json();
        alert(err.error || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this media?")) return;

    try {
      const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMedia(media.filter((m) => m.id !== id));
      } else {
        alert("Failed to delete media");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  async function handlePushContent() {
    if (!selectedMedia) return;
    if (pushTarget === "device" && !selectedDevice) return;
    if (pushTarget === "group" && !selectedGroup) return;

    setPushing(true);
    try {
      if (pushTarget === "device") {
        const device = devices.find(d => d.id === selectedDevice);
        const res = await fetch(`/api/device/${selectedDevice}/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "PLAY_CONTENT",
            contentId: selectedMedia.id,
            contentName: selectedMedia.name,
            contentUrl: selectedMedia.url,
            contentType: selectedMedia.type,
          }),
        });

        if (res.ok) {
          await fetch("/api/publish-jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              deviceId: selectedDevice,
              deviceName: device?.name || selectedDevice,
              contentType: selectedMedia.type,
              contentId: selectedMedia.id,
              contentName: selectedMedia.name,
              totalBytes: selectedMedia.size || null,
            }),
          });
        } else {
          alert("Failed to push content");
          return;
        }
      } else {
        const res = await fetch(`/api/device-groups/${selectedGroup}/push-content`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentId: selectedMedia.id,
            contentName: selectedMedia.name,
            contentUrl: selectedMedia.url,
            contentType: selectedMedia.type,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.devices && Array.isArray(data.devices)) {
            for (const device of data.devices) {
              await fetch("/api/publish-jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  deviceId: device.device_id,
                  deviceName: device.name || device.device_id,
                  contentType: selectedMedia.type,
                  contentId: selectedMedia.id,
                  contentName: selectedMedia.name,
                  totalBytes: selectedMedia.size || null,
                }),
              });
            }
          }
        } else {
          alert("Failed to push content to group");
          return;
        }
      }

      setShowPushDialog(false);
      setSelectedMedia(null);
      setSelectedDevice("");
      setSelectedGroup("");
      navigate("/monitor");
    } catch (err) {
      console.error("Push error:", err);
      alert("Failed to push content");
    } finally {
      setPushing(false);
    }
  }

  function formatSize(bytes?: number) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const images = media.filter((m) => m.type === "image");
  const videos = media.filter((m) => m.type === "video");

  function renderMediaGrid(items: MediaItem[]) {
    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No media found. Upload some content to get started.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.map((item) => (
          <Card
            key={item.id}
            data-testid={`media-card-${item.id}`}
            className="group relative aspect-square overflow-hidden border-border bg-card cursor-pointer"
          >
            {item.type === "video" ? (
              <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                <Film className="w-12 h-12 text-slate-500" />
              </div>
            ) : (
              <img
                src={item.url}
                alt={item.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23333' width='100' height='100'/%3E%3C/svg%3E";
                }}
              />
            )}

            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
              <div className="flex justify-end gap-1">
                <button
                  data-testid={`push-media-${item.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMedia(item);
                    setShowPushDialog(true);
                  }}
                  className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white"
                  title="Push to device"
                >
                  <Send className="w-4 h-4" />
                </button>
                <button
                  data-testid={`delete-media-${item.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  className="p-1.5 bg-red-600 hover:bg-red-700 rounded text-white"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <p className="text-white font-medium text-sm truncate">{item.name}</p>
                <p className="text-white/60 text-xs">{formatSize(item.size)}</p>
              </div>
            </div>

            <div className="absolute top-2 left-2 bg-black/50 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-white/80 uppercase">
              {item.type}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Media Library</h2>
          <p className="text-muted-foreground">Manage your creative assets and push content to devices</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleUpload}
            className="hidden"
            data-testid="input-file-upload"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            data-testid="button-upload-media"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Media
              </>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="all" data-testid="tab-all">
              All Assets ({media.length})
            </TabsTrigger>
            <TabsTrigger value="images" data-testid="tab-images">
              <ImageIcon className="w-4 h-4 mr-1" />
              Images ({images.length})
            </TabsTrigger>
            <TabsTrigger value="videos" data-testid="tab-videos">
              <Film className="w-4 h-4 mr-1" />
              Videos ({videos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {renderMediaGrid(media)}
          </TabsContent>

          <TabsContent value="images" className="space-y-6">
            {renderMediaGrid(images)}
          </TabsContent>

          <TabsContent value="videos" className="space-y-6">
            {renderMediaGrid(videos)}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={showPushDialog} onOpenChange={setShowPushDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Push Content</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Selected Content:</p>
              <p className="font-medium">{selectedMedia?.name}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Push to:</p>
              <div className="flex gap-2 mb-3">
                <Button
                  variant={pushTarget === "device" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPushTarget("device")}
                  data-testid="btn-push-target-device"
                >
                  Single Device
                </Button>
                <Button
                  variant={pushTarget === "group" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPushTarget("group")}
                  data-testid="btn-push-target-group"
                >
                  Device Group
                </Button>
              </div>

              {pushTarget === "device" ? (
                <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                  <SelectTrigger data-testid="select-device">
                    <SelectValue placeholder="Choose a device..." />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.name} {device.is_online ? "🟢" : "🔴"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger data-testid="select-group">
                    <SelectValue placeholder="Choose a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No groups available</div>
                    ) : (
                      groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name} {group.device_count !== undefined && `(${group.device_count} devices)`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPushDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePushContent}
              disabled={(pushTarget === "device" ? !selectedDevice : !selectedGroup) || pushing}
              data-testid="button-confirm-push"
            >
              {pushing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Push Content
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
