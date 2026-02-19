import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { UploadCloud, Plus, Trash2, Send, Image as ImageIcon, Film, Loader2, Search, ListMusic, Monitor, ChevronRight, Check, Settings, Volume2, Play, X, Pause, SkipBack, SkipForward, Clock, Calendar, RotateCcw, Archive, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface MediaItem {
  id: number;
  name: string;
  type: string;
  url: string;
  size?: number;
  duration?: number;
  uploadedAt?: string;
  expires_at?: string;
  is_expired?: boolean;
}

interface Device {
  id: string;
  name: string;
  location_branch?: string;
  is_online?: boolean;
}

interface PlaylistItem {
  id: number;
  name: string;
  type: string;
  url: string;
  itemId: number;
  duration: number;
  volume: number;
  position: number;
}

interface ContentPlaylist {
  id: number;
  name: string;
  description?: string;
  item_count: number;
  items: PlaylistItem[];
  created_at: string;
}

export default function ContentScheduler() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("media");
  const [search, setSearch] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [pushing, setPushing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [playlists, setPlaylists] = useState<ContentPlaylist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [showCreatePlaylistDialog, setShowCreatePlaylistDialog] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<ContentPlaylist | null>(null);
  const [assigningPlaylist, setAssigningPlaylist] = useState(false);
  const [showAddMediaDialog, setShowAddMediaDialog] = useState(false);
  const [selectedMediaForPlaylist, setSelectedMediaForPlaylist] = useState<number[]>([]);
  const [showItemSettingsDialog, setShowItemSettingsDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<PlaylistItem | null>(null);
  const [itemDuration, setItemDuration] = useState(10);
  const [itemVolume, setItemVolume] = useState(100);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewPlaylist, setPreviewPlaylist] = useState<ContentPlaylist | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [expiredMedia, setExpiredMedia] = useState<MediaItem[]>([]);
  const [loadingExpired, setLoadingExpired] = useState(false);
  const [showExpiryDialog, setShowExpiryDialog] = useState(false);
  const [expiryMediaItem, setExpiryMediaItem] = useState<MediaItem | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewMediaItem, setViewMediaItem] = useState<MediaItem | null>(null);

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

  async function loadExpiredMedia() {
    setLoadingExpired(true);
    try {
      const res = await fetch("/api/media/expired");
      if (res.ok) {
        const data = await res.json();
        setExpiredMedia(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load expired media:", err);
    } finally {
      setLoadingExpired(false);
    }
  }

  async function handleSetExpiry() {
    if (!expiryMediaItem) return;
    
    try {
      const res = await fetch(`/api/media/${expiryMediaItem.id}/expiry`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresAt: expiryDate || null }),
      });
      
      if (res.ok) {
        loadMedia();
        // Always refresh expired list in case item moved between active/expired
        loadExpiredMedia();
        setShowExpiryDialog(false);
        setExpiryMediaItem(null);
        setExpiryDate("");
      } else {
        alert("Failed to set expiry date");
      }
    } catch (err) {
      console.error("Set expiry error:", err);
      alert("Failed to set expiry date");
    }
  }

  function openViewDialog(item: MediaItem) {
    setViewMediaItem(item);
    setShowViewDialog(true);
  }

  async function handleRestoreMedia(id: number) {
    try {
      const res = await fetch(`/api/media/${id}/restore`, {
        method: "POST",
      });
      
      if (res.ok) {
        loadExpiredMedia();
        loadMedia();
      } else {
        alert("Failed to restore media");
      }
    } catch (err) {
      console.error("Restore media error:", err);
      alert("Failed to restore media");
    }
  }

  function openExpiryDialog(item: MediaItem) {
    setExpiryMediaItem(item);
    setExpiryDate(item.expires_at ? item.expires_at.split("T")[0] : "");
    setShowExpiryDialog(true);
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

  async function loadPlaylists() {
    setLoadingPlaylists(true);
    try {
      const res = await fetch("/api/content-playlists");
      if (res.ok) {
        const data = await res.json();
        setPlaylists(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load playlists:", err);
    } finally {
      setLoadingPlaylists(false);
    }
  }

  useEffect(() => {
    loadMedia();
    loadDevices();
    loadPlaylists();
  }, []);

  useEffect(() => {
    if (activeTab === "expired") {
      loadExpiredMedia();
    }
  }, [activeTab]);

  // Auto-play slideshow effect
  useEffect(() => {
    if (!showPreviewDialog || !isPlaying || !previewPlaylist?.items?.length) return;

    const currentItem = previewPlaylist.items[previewIndex];
    const duration = (currentItem?.duration || 10) * 1000;
    
    setTimeRemaining(currentItem?.duration || 10);
    
    // Countdown timer
    const countdownInterval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    // Advance to next item
    const timeout = setTimeout(() => {
      setPreviewIndex(prev => (prev + 1) % previewPlaylist.items.length);
    }, duration);

    return () => {
      clearTimeout(timeout);
      clearInterval(countdownInterval);
    };
  }, [showPreviewDialog, isPlaying, previewIndex, previewPlaylist]);

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
      alert("Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this content?")) return;

    try {
      const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadMedia();
      } else {
        alert("Failed to delete media");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete media");
    }
  }

  async function handlePushContent() {
    if (!selectedMedia || !selectedDevice) return;

    setPushing(true);
    try {
      const res = await fetch(`/api/device/${selectedDevice}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PLAY_CONTENT",
          contentId: selectedMedia.id,
          contentUrl: selectedMedia.url,
          contentName: selectedMedia.name,
          contentType: selectedMedia.type,
        }),
      });

      if (res.ok) {
        const device = devices.find(d => d.id === selectedDevice);
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
        setShowPushDialog(false);
        setSelectedMedia(null);
        setSelectedDevice("");
        window.location.href = "/monitor";
      } else {
        alert("Failed to push content");
      }
    } catch (err) {
      console.error("Push error:", err);
      alert("Failed to push content");
    } finally {
      setPushing(false);
    }
  }

  async function handleCreatePlaylist() {
    if (!newPlaylistName.trim()) return;

    setCreatingPlaylist(true);
    try {
      const res = await fetch("/api/content-playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPlaylistName,
          description: newPlaylistDescription,
        }),
      });

      if (res.ok) {
        setShowCreatePlaylistDialog(false);
        setNewPlaylistName("");
        setNewPlaylistDescription("");
        loadPlaylists();
      } else {
        alert("Failed to create playlist");
      }
    } catch (err) {
      console.error("Create playlist error:", err);
      alert("Failed to create playlist");
    } finally {
      setCreatingPlaylist(false);
    }
  }

  async function handleDeletePlaylist(id: number) {
    if (!confirm("Delete this playlist? This will remove all items and assignments.")) return;

    try {
      const res = await fetch(`/api/content-playlists/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadPlaylists();
      } else {
        alert("Failed to delete playlist");
      }
    } catch (err) {
      console.error("Delete playlist error:", err);
      alert("Failed to delete playlist");
    }
  }

  async function handleRemovePlaylistItem(playlistId: number, itemId: number) {
    try {
      const res = await fetch(`/api/content-playlists/${playlistId}/items/${itemId}`, { 
        method: "DELETE" 
      });
      if (res.ok) {
        loadPlaylists();
      } else {
        alert("Failed to remove item from playlist");
      }
    } catch (err) {
      console.error("Remove playlist item error:", err);
      alert("Failed to remove item");
    }
  }

  async function handleAssignPlaylist() {
    if (!selectedPlaylist || !selectedDevice) return;

    setAssigningPlaylist(true);
    try {
      const res = await fetch(`/api/content-playlists/${selectedPlaylist.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: selectedDevice }),
      });

      if (res.ok) {
        alert(`Playlist "${selectedPlaylist.name}" assigned to device!`);
        setShowAssignDialog(false);
        setSelectedPlaylist(null);
        setSelectedDevice("");
      } else {
        alert("Failed to assign playlist");
      }
    } catch (err) {
      console.error("Assign error:", err);
      alert("Failed to assign playlist");
    } finally {
      setAssigningPlaylist(false);
    }
  }

  async function handleAddMediaToPlaylist() {
    if (!selectedPlaylist || selectedMediaForPlaylist.length === 0) return;

    try {
      const res = await fetch(`/api/content-playlists/${selectedPlaylist.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaIds: selectedMediaForPlaylist }),
      });

      if (res.ok) {
        setShowAddMediaDialog(false);
        setSelectedMediaForPlaylist([]);
        loadPlaylists();
      } else {
        alert("Failed to add media to playlist");
      }
    } catch (err) {
      console.error("Add media error:", err);
      alert("Failed to add media to playlist");
    }
  }
  
  function toggleMediaSelection(mediaId: number) {
    setSelectedMediaForPlaylist(prev => 
      prev.includes(mediaId) 
        ? prev.filter(id => id !== mediaId)
        : [...prev, mediaId]
    );
  }

  function openItemSettings(item: PlaylistItem) {
    setEditingItem(item);
    setItemDuration(item.duration || 10);
    setItemVolume(item.volume ?? 100);
    setShowItemSettingsDialog(true);
  }

  async function handleSaveItemSettings() {
    if (!editingItem) return;
    
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/playlist-items/${editingItem.itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: itemDuration, volume: itemVolume }),
      });

      if (res.ok) {
        setShowItemSettingsDialog(false);
        setEditingItem(null);
        loadPlaylists();
      } else {
        alert("Failed to save settings");
      }
    } catch (err) {
      console.error("Save settings error:", err);
      alert("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  }

  function formatSize(bytes?: number) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const filteredMedia = media.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.type.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPlaylists = playlists.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredExpiredMedia = expiredMedia.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Content Manager</h1>
          <p className="text-muted-foreground">Upload, manage, and push content to your devices</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="media" data-testid="tab-media">
              <ImageIcon className="h-4 w-4 mr-2" />
              Media
            </TabsTrigger>
            <TabsTrigger value="playlists" data-testid="tab-playlists">
              <ListMusic className="h-4 w-4 mr-2" />
              Playlists
            </TabsTrigger>
            <TabsTrigger value="expired" data-testid="tab-expired">
              <Archive className="h-4 w-4 mr-2" />
              Expired Content
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2 ml-auto">
            {activeTab === "media" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate("/template")}
                  data-testid="button-template-designer"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Template Designer
                </Button>
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
                  data-testid="button-upload"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4 mr-2" />
                      Upload Content
                    </>
                  )}
                </Button>
              </>
            )}
            {activeTab === "playlists" && (
              <Button
                onClick={() => setShowCreatePlaylistDialog(true)}
                data-testid="button-create-playlist"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Playlist
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-4 flex-wrap mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={activeTab === "media" ? "Search content..." : activeTab === "expired" ? "Search expired content..." : "Search playlists..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        <TabsContent value="media">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No content found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? "Try a different search term" : "Upload some content to get started"}
              </p>
              {!search && (
                <Button onClick={() => fileInputRef.current?.click()} data-testid="button-upload-empty">
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Content
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMedia.map((item) => (
                <Card
                  key={item.id}
                  data-testid={`content-card-${item.id}`}
                  className="overflow-hidden group"
                >
                  <div className="aspect-video bg-muted relative">
                    {item.type === "video" ? (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800">
                        <Film className="w-12 h-12 text-slate-500" />
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23333' width='100' height='100'/%3E%3C/svg%3E";
                        }}
                      />
                    )}
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white uppercase">
                      {item.type}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-medium text-foreground truncate" title={item.name}>
                      {item.name}
                    </h3>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{formatSize(item.size)}</span>
                      {item.expires_at && (
                        <span className="flex items-center text-amber-500 text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Expires {new Date(item.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedMedia(item);
                          setShowPushDialog(true);
                        }}
                        data-testid={`button-push-${item.id}`}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Push
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openExpiryDialog(item)}
                        data-testid={`button-expiry-${item.id}`}
                        title="Set expiry date"
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(item.id)}
                        data-testid={`button-delete-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="playlists">
          {loadingPlaylists ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPlaylists.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <ListMusic className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No playlists found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? "Try a different search term" : "Create a playlist to organize your content"}
              </p>
              {!search && (
                <Button onClick={() => setShowCreatePlaylistDialog(true)} data-testid="button-create-playlist-empty">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Playlist
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlaylists.map((playlist) => (
                <Card key={playlist.id} data-testid={`playlist-card-${playlist.id}`} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                        <ListMusic className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{playlist.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {playlist.item_count || 0} items
                        </p>
                      </div>
                    </div>
                    {playlist.items && playlist.items.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500"
                        onClick={() => {
                          setPreviewPlaylist(playlist);
                          setPreviewIndex(0);
                          setShowPreviewDialog(true);
                        }}
                        data-testid={`button-preview-playlist-${playlist.id}`}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {playlist.description && (
                    <p className="text-sm text-muted-foreground mb-3">{playlist.description}</p>
                  )}

                  {playlist.items && playlist.items.length > 0 && (
                    <div className="space-y-1 mb-3 max-h-[140px] overflow-y-auto">
                      {playlist.items.map((item, idx) => (
                        <div
                          key={item.itemId || idx}
                          className="flex items-center gap-2 p-1.5 rounded bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                            {item.type === "video" ? (
                              <Film className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <img src={item.url} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate text-foreground">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.duration}s {item.type === "video" && `• ${item.volume ?? 100}% vol`}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              openItemSettings(item);
                            }}
                            data-testid={`button-settings-item-${item.itemId}`}
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePlaylistItem(playlist.id, item.itemId);
                            }}
                            data-testid={`button-remove-item-${item.itemId}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedPlaylist(playlist);
                        setShowAddMediaDialog(true);
                      }}
                      data-testid={`button-add-media-${playlist.id}`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Media
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedPlaylist(playlist);
                        setShowAssignDialog(true);
                      }}
                      data-testid={`button-assign-${playlist.id}`}
                    >
                      <Monitor className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeletePlaylist(playlist.id)}
                      data-testid={`button-delete-playlist-${playlist.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expired">
          {loadingExpired ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredExpiredMedia.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Archive className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No expired content</h3>
              <p className="text-muted-foreground mb-4">
                {search ? "No matching expired content found" : "Content that has passed its expiry date will appear here"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredExpiredMedia.map((item) => (
                <Card
                  key={item.id}
                  data-testid={`expired-card-${item.id}`}
                  className="overflow-hidden group border-amber-500/30"
                >
                  <div className="aspect-video bg-muted relative">
                    {item.type === "video" ? (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800">
                        <Film className="w-12 h-12 text-slate-500" />
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover opacity-60"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23333' width='100' height='100'/%3E%3C/svg%3E";
                        }}
                      />
                    )}
                    <div className="absolute top-2 left-2 px-2 py-1 bg-amber-600 rounded text-xs text-white">
                      EXPIRED
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-medium text-foreground truncate" title={item.name}>
                      {item.name}
                    </h3>
                    <div className="text-sm text-muted-foreground">
                      <span>{formatSize(item.size)}</span>
                      {item.expires_at && (
                        <span className="ml-2 text-amber-500 text-xs">
                          Expired {new Date(item.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openViewDialog(item)}
                        data-testid={`button-view-expired-${item.id}`}
                        title="View content"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openExpiryDialog(item)}
                        data-testid={`button-edit-expiry-${item.id}`}
                        title="Change expiry date"
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        variant="outline"
                        onClick={() => handleRestoreMedia(item.id)}
                        data-testid={`button-restore-${item.id}`}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(item.id)}
                        data-testid={`button-delete-expired-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

      </Tabs>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">{viewMediaItem?.name}</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Preview content
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {viewMediaItem?.type === "video" ? (
              <video
                src={viewMediaItem.url}
                controls
                autoPlay
                className="w-full max-h-[60vh] rounded-lg"
                data-testid="video-preview"
              />
            ) : (
              <img
                src={viewMediaItem?.url}
                alt={viewMediaItem?.name}
                className="w-full max-h-[60vh] object-contain rounded-lg"
                data-testid="image-preview"
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExpiryDialog} onOpenChange={setShowExpiryDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Set Expiry Date</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Set when this content should expire. Expired content will be automatically removed from playlists and schedules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Content:</p>
              <p className="font-medium text-slate-900 dark:text-white">{expiryMediaItem?.name}</p>
            </div>

            <div>
              <Label className="text-slate-700 dark:text-slate-300">Expiry Date</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="mt-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                data-testid="input-expiry-date"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty for no expiry
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpiryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetExpiry} data-testid="button-save-expiry">
              <Calendar className="w-4 h-4 mr-2" />
              Save Expiry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPushDialog} onOpenChange={setShowPushDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Push Content to Device</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Select a device to send the selected content to.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Selected Content:</p>
              <p className="font-medium text-slate-900 dark:text-white">{selectedMedia?.name}</p>
            </div>

            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Select Device:</p>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger data-testid="select-device" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600">
                  <SelectValue placeholder="Choose a device..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600">
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={device.id} className="hover:bg-slate-100 dark:hover:bg-slate-700 focus:bg-slate-100 dark:focus:bg-slate-700">
                      {device.name} {device.is_online ? "🟢" : "🔴"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPushDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePushContent}
              disabled={!selectedDevice || pushing}
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

      <Dialog open={showCreatePlaylistDialog} onOpenChange={setShowCreatePlaylistDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Create New Playlist</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Create a playlist to organize and schedule content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">Playlist Name</label>
              <Input
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Enter playlist name..."
                data-testid="input-playlist-name"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">Description (optional)</label>
              <Input
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                placeholder="Enter description..."
                data-testid="input-playlist-description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePlaylistDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlaylist}
              disabled={!newPlaylistName.trim() || creatingPlaylist}
              data-testid="button-confirm-create-playlist"
            >
              {creatingPlaylist ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Playlist
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Assign Playlist to Device</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Select a device to assign this playlist to.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Selected Playlist:</p>
              <p className="font-medium text-slate-900 dark:text-white">{selectedPlaylist?.name}</p>
            </div>

            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Select Device:</p>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger data-testid="select-device-assign" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600">
                  <SelectValue placeholder="Choose a device..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600">
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={device.id} className="hover:bg-slate-100 dark:hover:bg-slate-700 focus:bg-slate-100 dark:focus:bg-slate-700">
                      {device.name} {device.is_online ? "🟢" : "🔴"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignPlaylist}
              disabled={!selectedDevice || assigningPlaylist}
              data-testid="button-confirm-assign"
            >
              {assigningPlaylist ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Monitor className="w-4 h-4 mr-2" />
                  Assign Playlist
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddMediaDialog} onOpenChange={setShowAddMediaDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Add Media to Playlist</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Select media to add to "{selectedPlaylist?.name}". 
              <span className="ml-1">({media.length} items available)</span>
              {selectedMediaForPlaylist.length > 0 && (
                <span className="ml-2 text-cyan-500 font-medium">
                  • {selectedMediaForPlaylist.length} selected
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto py-4 pr-2">
            {media.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleMediaSelection(item.id)}
                className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all relative ${
                  selectedMediaForPlaylist.includes(item.id)
                    ? "border-cyan-500 ring-2 ring-cyan-500/50"
                    : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                }`}
                data-testid={`media-option-${item.id}`}
              >
                {selectedMediaForPlaylist.includes(item.id) && (
                  <div className="absolute top-1 right-1 z-10 bg-cyan-500 rounded-full p-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="aspect-video bg-muted relative">
                  {item.type === "video" ? (
                    <div className="w-full h-full relative bg-slate-800">
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                        onLoadedData={(e) => {
                          const video = e.currentTarget;
                          video.currentTime = 0.5;
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Film className="w-6 h-6 text-white" />
                      </div>
                      <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1 rounded">
                        VIDEO
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={item.url} 
                      alt={item.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                        const icon = document.createElement('div');
                        icon.innerHTML = '<svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                        e.currentTarget.parentElement?.appendChild(icon);
                      }}
                    />
                  )}
                </div>
                <div className="p-1.5 bg-slate-50 dark:bg-slate-800">
                  <p className="text-xs truncate text-slate-900 dark:text-white font-medium">{item.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">{item.type}</p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMediaDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMediaToPlaylist}
              disabled={selectedMediaForPlaylist.length === 0}
              data-testid="button-confirm-add-media"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {selectedMediaForPlaylist.length > 0 ? `${selectedMediaForPlaylist.length} ` : ""}to Playlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showItemSettingsDialog} onOpenChange={setShowItemSettingsDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Content Settings
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Configure playback settings for "{editingItem?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-900 dark:text-white">
                Duration (seconds)
              </Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[itemDuration]}
                  onValueChange={(value) => setItemDuration(value[0])}
                  min={1}
                  max={120}
                  step={1}
                  className="flex-1"
                  data-testid="slider-duration"
                />
                <span className="w-12 text-center text-sm font-medium text-slate-900 dark:text-white">
                  {itemDuration}s
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {editingItem?.type === "video" 
                  ? "How long to play the video (or set to video length)" 
                  : "How long to display this image"}
              </p>
            </div>

            {editingItem?.type === "video" && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Volume
                </Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[itemVolume]}
                    onValueChange={(value) => setItemVolume(value[0])}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                    data-testid="slider-volume"
                  />
                  <span className="w-12 text-center text-sm font-medium text-slate-900 dark:text-white">
                    {itemVolume}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Set to 0 to mute the video
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemSettingsDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveItemSettings}
              disabled={savingSettings}
              data-testid="button-save-settings"
            >
              {savingSettings ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="bg-slate-900 text-white border-slate-700 shadow-xl max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <ListMusic className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{previewPlaylist?.name}</h3>
                  <p className="text-sm text-slate-400">
                    {previewPlaylist?.items?.length || 0} items • Viewing {previewIndex + 1} of {previewPlaylist?.items?.length || 0}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                onClick={() => setShowPreviewDialog(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 flex">
              <div className="w-2/3 bg-black flex flex-col">
                <div className="flex-1 flex items-center justify-center p-4">
                  {previewPlaylist?.items && previewPlaylist.items[previewIndex] && (
                    previewPlaylist.items[previewIndex].type === "video" ? (
                      <video
                        key={previewPlaylist.items[previewIndex].id}
                        src={previewPlaylist.items[previewIndex].url}
                        className="max-w-full max-h-[55vh] object-contain"
                        controls
                        autoPlay
                        muted={previewPlaylist.items[previewIndex].volume === 0}
                      />
                    ) : (
                      <img
                        key={previewPlaylist.items[previewIndex].id}
                        src={previewPlaylist.items[previewIndex].url}
                        alt={previewPlaylist.items[previewIndex].name}
                        className="max-w-full max-h-[55vh] object-contain"
                      />
                    )
                  )}
                </div>
                
                {/* Playback controls */}
                <div className="p-4 border-t border-slate-700 bg-slate-900/80">
                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-500 transition-all duration-1000"
                        style={{ 
                          width: `${((previewPlaylist?.items?.[previewIndex]?.duration || 10) - timeRemaining) / (previewPlaylist?.items?.[previewIndex]?.duration || 10) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                        onClick={() => setPreviewIndex(prev => prev === 0 ? (previewPlaylist?.items?.length || 1) - 1 : prev - 1)}
                        data-testid="button-prev-item"
                      >
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-10 w-10 p-0 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white"
                        onClick={() => setIsPlaying(!isPlaying)}
                        data-testid="button-play-pause"
                      >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                        onClick={() => setPreviewIndex(prev => (prev + 1) % (previewPlaylist?.items?.length || 1))}
                        data-testid="button-next-item"
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-slate-400">
                        {isPlaying ? `Next in ${timeRemaining}s` : "Paused"}
                      </span>
                      <span className="text-white font-medium">
                        {previewIndex + 1} / {previewPlaylist?.items?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-1/3 border-l border-slate-700 overflow-y-auto max-h-[70vh]">
                <div className="p-3 border-b border-slate-700 sticky top-0 bg-slate-900">
                  <h4 className="text-sm font-medium text-slate-300">Playlist Items</h4>
                </div>
                <div className="divide-y divide-slate-700/50">
                  {previewPlaylist?.items?.map((item, idx) => (
                    <div
                      key={item.itemId || idx}
                      onClick={() => setPreviewIndex(idx)}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                        idx === previewIndex 
                          ? "bg-cyan-500/20 border-l-2 border-cyan-500" 
                          : "hover:bg-slate-800"
                      }`}
                      data-testid={`preview-item-${item.itemId}`}
                    >
                      <div className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {item.type === "video" ? (
                          <div className="relative w-full h-full">
                            <video src={item.url} className="w-full h-full object-cover" muted preload="metadata" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <Film className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <img src={item.url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-white">{item.name}</p>
                        <p className="text-xs text-slate-400">
                          {item.duration}s • {item.type.toUpperCase()}
                        </p>
                      </div>
                      {idx === previewIndex && (
                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
