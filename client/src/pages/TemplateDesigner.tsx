import { useState, useRef, DragEvent, MouseEvent, useEffect, useCallback, Component, ErrorInfo, ReactNode } from "react";
import { Plus, Save, Play, RotateCcw, Type, Image, Video, Rss, Share2, Move, Trash2, Palette, Droplets, ListMusic, UploadCloud, Loader2, Clock, AlertTriangle, Grid, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, FolderOpen, DollarSign, Check } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class TemplateDesignerErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Template Designer Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[400px] bg-red-50 rounded-lg m-4">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h2>
          <p className="text-red-600 mb-4">The Template Designer encountered an error.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | null;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface CanvasElement {
  id: number;
  type: "Text" | "Image" | "Video" | "RSS" | "Ticker" | "Social" | "Playlist" | "DateTime" | "Pricing";
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  dateFormat?: string;
  textAlign?: "left" | "center" | "right";
  textType?: "paragraph" | "heading1" | "heading2" | "heading3";
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  language?: "en" | "ar";
  tickerMode?: "text" | "iframe" | "screenshot" | "live";
  tickerSpeed?: number;
  tickerRefreshRate?: number;
  playlistId?: number;
}

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Georgia", label: "Georgia" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Courier New", label: "Courier New" },
  { value: "Verdana", label: "Verdana" },
  { value: "Tahoma", label: "Tahoma" },
];

const FONT_SIZE_OPTIONS = [
  12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 84, 96, 120
];

const DATE_FORMAT_OPTIONS = [
  { value: "HH:mm", label: "Time only (14:30)" },
  { value: "hh:mm A", label: "Time 12h (02:30 PM)" },
  { value: "HH:mm:ss", label: "Time with seconds (14:30:45)" },
  { value: "DD/MM/YYYY", label: "Date DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "Date MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "Date YYYY-MM-DD" },
  { value: "DD MMM YYYY", label: "Date (16 Dec 2025)" },
  { value: "dddd, MMMM D", label: "Day & Date (Monday, December 16)" },
  { value: "DD/MM/YYYY HH:mm", label: "Date & Time" },
  { value: "dddd, DD MMM YYYY HH:mm", label: "Full (Monday, 16 Dec 2025 14:30)" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDateTime(format: string, date: Date): string {
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const dayOfWeek = date.getDay();
  const ampm = hours24 >= 12 ? "PM" : "AM";

  return format
    .replace("HH", String(hours24).padStart(2, "0"))
    .replace("hh", String(hours12).padStart(2, "0"))
    .replace("mm", String(minutes).padStart(2, "0"))
    .replace("ss", String(seconds).padStart(2, "0"))
    .replace("A", ampm)
    .replace("dddd", DAYS[dayOfWeek])
    .replace("DD", String(day).padStart(2, "0"))
    .replace("D", String(day))
    .replace("MMMM", MONTHS_FULL[month])
    .replace("MMM", MONTHS[month])
    .replace("MM", String(month + 1).padStart(2, "0"))
    .replace("YYYY", String(year));
}

interface CanvasBackground {
  type: "color" | "image" | "video";
  color: string;
  imageUrl: string;
  videoUrl: string;
}

interface MediaItem {
  id: number;
  name: string;
  type: string;
  url: string;
}

interface Watermark {
  enabled: boolean;
  text: string;
  imageUrl: string;
  type: "text" | "image";
  opacity: number;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  size: number;
}

const CANVAS_WIDTH_LANDSCAPE = 1920;
const CANVAS_HEIGHT_LANDSCAPE = 1080;
const SCALE_FACTOR = 0.45;

function TemplateDesignerContent() {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draggedType, setDraggedType] = useState<string | null>(null);
  const [editingPanel, setEditingPanel] = useState<"element" | "background" | "watermark">("element");
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  
  const snapValue = (value: number) => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  const [resizing, setResizing] = useState<{
    elementId: number;
    handle: ResizeHandle;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startElX: number;
    startElY: number;
  } | null>(null);

  const [background, setBackground] = useState<CanvasBackground>({
    type: "color",
    color: "#ffffff",
    imageUrl: "",
    videoUrl: "",
  });

  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const elementFileInputRef = useRef<HTMLInputElement>(null);
  const templateDataRef = useRef<any>(null);
  const [uploadingElement, setUploadingElement] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [currentTemplateId, setCurrentTemplateId] = useState<number | null>(null);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [rssFeeds, setRssFeeds] = useState<Record<string, any[]>>({});
  const [tickerContent, setTickerContent] = useState<Record<string, string>>({});
  const [tickerScreenshots, setTickerScreenshots] = useState<Record<string, string>>({});
  const [contentPlaylists, setContentPlaylists] = useState<{ id: number; name: string; item_count: number }[]>([]);
  const [playlistData, setPlaylistData] = useState<Record<number, { id: number; name: string; type: string; url: string; duration?: number; volume?: number }[]>>({});
  const [playlistIndices, setPlaylistIndices] = useState<Record<number, number>>({});

  // Update current time every second for live clock display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch content playlists for the playlist element dropdown
  useEffect(() => {
    async function fetchPlaylists() {
      try {
        const res = await fetch("/api/content-playlists");
        if (res.ok) {
          const data = await res.json();
          setContentPlaylists(data);
        }
      } catch (err) {
        console.error("Failed to fetch playlists:", err);
      }
    }
    fetchPlaylists();
  }, []);

  // Fetch saved templates
  async function loadSavedTemplates() {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data = await res.json();
        setSavedTemplates(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoadingTemplates(false);
    }
  }

  // Load a specific template (with migration for legacy templates)
  function loadTemplate(template: any) {
    // Support both direct fields and layout-based storage
    const elementsData = template.elements || template.layout?.elements || [];
    const orientationData = template.orientation || template.layout?.orientation || "landscape";
    const backgroundData = template.background || template.layout?.background;
    const watermarkData = template.watermark || template.layout?.watermark;
    
    if (elementsData && elementsData.length > 0) {
      // Migrate legacy Ticker elements to have default tickerMode and tickerSpeed
      const migratedElements = elementsData.map((el: CanvasElement) => {
        if (el.type === "Ticker") {
          return {
            ...el,
            tickerMode: el.tickerMode || "live",
            tickerSpeed: el.tickerSpeed || 20,
            tickerRefreshRate: el.tickerRefreshRate || 5,
          };
        }
        return el;
      });
      setElements(migratedElements);
    } else {
      setElements([]);
    }
    
    setOrientation(orientationData);
    if (backgroundData) setBackground(backgroundData);
    if (watermarkData) setWatermark(watermarkData);
    
    // Track the loaded template for auto-save
    if (template.id) {
      setCurrentTemplateId(template.id);
      setTemplateName(template.name || "");
      setHasUnsavedChanges(false);
    }
    setShowLoadDialog(false);
  }

  // Fetch RSS feed
  async function fetchRssFeed(url: string) {
    if (!url || rssFeeds[url]) return;
    try {
      const res = await fetch(`/api/rss-proxy?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        setRssFeeds(prev => ({ ...prev, [url]: data.items || [] }));
      }
    } catch (err) {
      console.error("Failed to fetch RSS:", err);
    }
  }

  // Fetch RSS feeds for all RSS elements when preview opens
  useEffect(() => {
    if (showPreview) {
      const rssElements = elements.filter(el => el.type === "RSS" && el.content && el.content.startsWith("http"));
      console.log("Preview opened, fetching RSS for:", rssElements.map(e => e.content));
      
      rssElements.forEach(el => {
        (async () => {
          try {
            console.log("Fetching RSS:", el.content);
            const res = await fetch(`/api/rss-proxy?url=${encodeURIComponent(el.content)}`);
            if (res.ok) {
              const data = await res.json();
              console.log("RSS response for", el.content, ":", data.items?.length, "items");
              setRssFeeds(prev => ({ ...prev, [el.content]: data.items || [] }));
            } else {
              console.error("RSS fetch failed:", res.status);
              setRssFeeds(prev => ({ ...prev, [el.content]: [] }));
            }
          } catch (err) {
            console.error("Failed to fetch RSS:", err);
            setRssFeeds(prev => ({ ...prev, [el.content]: [] }));
          }
        })();
      });
    }
  }, [showPreview, elements]);

  // Fetch ticker content for all Ticker elements when preview opens
  useEffect(() => {
    if (showPreview) {
      const tickerElements = elements.filter(el => (el.type === "Ticker" || el.type === "Pricing") && el.content && el.content.startsWith("http"));
      console.log("Preview opened, fetching Ticker/Pricing content for:", tickerElements.map(e => e.content));
      
      tickerElements.forEach(el => {
        const mode = el.tickerMode || "iframe";
        
        if (mode === "text") {
          // Fetch text content for text mode
          (async () => {
            try {
              console.log("Fetching Ticker text:", el.content);
              const res = await fetch(`/api/ticker-proxy?url=${encodeURIComponent(el.content)}`);
              if (res.ok) {
                const data = await res.json();
                console.log("Ticker response for", el.content, ":", data.text?.length, "chars");
                setTickerContent(prev => ({ ...prev, [el.content]: data.text || "" }));
              } else {
                console.error("Ticker fetch failed:", res.status);
                setTickerContent(prev => ({ ...prev, [el.content]: "" }));
              }
            } catch (err) {
              console.error("Failed to fetch Ticker:", err);
              setTickerContent(prev => ({ ...prev, [el.content]: "" }));
            }
          })();
        } else if (mode === "screenshot" || mode === "live") {
          // Fetch screenshot for screenshot/live mode
          (async () => {
            try {
              console.log("Fetching Ticker screenshot:", el.content, "mode:", mode);
              setTickerScreenshots(prev => ({ ...prev, [el.content]: "loading" }));
              const res = await fetch(`/api/webpage-screenshot?url=${encodeURIComponent(el.content)}&width=${el.width}&height=${el.height}`);
              if (res.ok) {
                const data = await res.json();
                console.log("Screenshot captured for", el.content);
                setTickerScreenshots(prev => ({ ...prev, [el.content]: data.image || "" }));
              } else {
                console.error("Screenshot fetch failed:", res.status);
                setTickerScreenshots(prev => ({ ...prev, [el.content]: "error" }));
              }
            } catch (err) {
              console.error("Failed to fetch screenshot:", err);
              setTickerScreenshots(prev => ({ ...prev, [el.content]: "error" }));
            }
          })();
        }
        // iframe mode doesn't need prefetching
      });
    }
  }, [showPreview, elements]);

  // Auto-refresh for live mode tickers (using recursive setTimeout to prevent overlapping requests)
  useEffect(() => {
    if (!showPreview) return;
    
    const liveTickerElements = elements.filter(
      el => (el.type === "Ticker" || el.type === "Pricing") && el.tickerMode === "live" && el.content && el.content.startsWith("http")
    );
    
    if (liveTickerElements.length === 0) return;
    
    // Track active state and timeout IDs for cleanup
    let isActive = true;
    const timeoutIds: NodeJS.Timeout[] = [];
    
    liveTickerElements.forEach(el => {
      const refreshMs = Math.max(2000, (el.tickerRefreshRate || 5) * 1000);
      
      // Use recursive setTimeout to prevent overlapping requests
      const scheduleRefresh = () => {
        if (!isActive) return;
        
        const timeoutId = setTimeout(async () => {
          if (!isActive) return;
          
          try {
            console.log("Auto-refreshing live ticker:", el.content);
            const res = await fetch(`/api/webpage-screenshot?url=${encodeURIComponent(el.content)}&width=${el.width}&height=${el.height}&t=${Date.now()}`);
            if (res.ok && isActive) {
              const data = await res.json();
              setTickerScreenshots(prev => ({ ...prev, [el.content]: data.image || prev[el.content] }));
            }
          } catch (err) {
            console.error("Live ticker refresh failed:", err);
          }
          
          // Schedule next refresh only after current one completes
          if (isActive) {
            scheduleRefresh();
          }
        }, refreshMs);
        
        timeoutIds.push(timeoutId);
      };
      
      // Start the refresh cycle
      scheduleRefresh();
    });
    
    return () => {
      isActive = false;
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [showPreview, elements]);

  // Fetch playlist items when preview opens
  useEffect(() => {
    if (!showPreview) return;
    
    const playlistElements = elements.filter(el => el.type === "Playlist" && el.playlistId);
    
    playlistElements.forEach(el => {
      if (el.playlistId && !playlistData[el.playlistId]) {
        (async () => {
          try {
            const res = await fetch(`/api/content-playlists`);
            if (res.ok) {
              const data = await res.json();
              const playlist = data.find((p: any) => p.id === el.playlistId);
              if (playlist && playlist.items) {
                setPlaylistData(prev => ({ ...prev, [el.playlistId!]: playlist.items }));
                setPlaylistIndices(prev => ({ ...prev, [el.playlistId!]: 0 }));
              }
            }
          } catch (err) {
            console.error("Failed to fetch playlist items:", err);
          }
        })();
      }
    });
  }, [showPreview, elements]);

  // Cycle through playlist items
  useEffect(() => {
    if (!showPreview) return;
    
    const playlistElements = elements.filter(el => el.type === "Playlist" && el.playlistId);
    if (playlistElements.length === 0) return;
    
    const intervalIds: NodeJS.Timeout[] = [];
    
    playlistElements.forEach(el => {
      if (el.playlistId && playlistData[el.playlistId]?.length > 1) {
        const items = playlistData[el.playlistId];
        const currentItem = items[playlistIndices[el.playlistId] || 0];
        const duration = (currentItem?.duration || 10) * 1000;
        
        const intervalId = setInterval(() => {
          setPlaylistIndices(prev => ({
            ...prev,
            [el.playlistId!]: ((prev[el.playlistId!] || 0) + 1) % items.length
          }));
        }, duration);
        
        intervalIds.push(intervalId);
      }
    });
    
    return () => {
      intervalIds.forEach(id => clearInterval(id));
    };
  }, [showPreview, elements, playlistData]);

  async function handleSaveTemplate() {
    if (!templateName.trim()) {
      setSaveError("Please enter a template name");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const templateData = {
        name: templateName.trim(),
        orientation,
        elements,
        background,
        watermark,
      };

      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData),
      });

      if (res.ok) {
        setShowSaveDialog(false);
        setTemplateName("");
        alert("Template saved successfully!");
      } else {
        const error = await res.json();
        setSaveError(error.error || "Failed to save template");
      }
    } catch (err) {
      console.error("Save error:", err);
      setSaveError("Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function handleElementUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;

    setUploadingElement(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        updateElement(selectedId, { content: data.url });
        loadMediaLibrary();
      }
    } catch (err) {
      console.error("Failed to upload media:", err);
    } finally {
      setUploadingElement(false);
      if (elementFileInputRef.current) {
        elementFileInputRef.current.value = "";
      }
    }
  }

  async function loadMediaLibrary() {
    setLoadingMedia(true);
    try {
      const res = await fetch("/api/media");
      if (res.ok) {
        const data = await res.json();
        setMediaLibrary(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load media:", err);
    } finally {
      setLoadingMedia(false);
    }
  }

  useEffect(() => {
    loadMediaLibrary();
  }, []);

  async function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBg(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const mediaItem = data.media;
        if (mediaItem) {
          if (mediaItem.type === "video") {
            setBackground({ ...background, type: "video", videoUrl: mediaItem.url });
          } else {
            setBackground({ ...background, type: "image", imageUrl: mediaItem.url });
          }
          loadMediaLibrary();
        }
      } else {
        alert("Failed to upload file");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload file");
    } finally {
      setUploadingBg(false);
      if (bgFileInputRef.current) {
        bgFileInputRef.current.value = "";
      }
    }
  }

  const [watermark, setWatermark] = useState<Watermark>({
    enabled: false,
    text: "WATERMARK",
    imageUrl: "",
    type: "text",
    opacity: 30,
    position: "bottom-right",
    size: 48,
  });

  // Auto-save function (silent, no dialog)
  async function autoSaveTemplate() {
    if (!currentTemplateId || !templateName.trim()) return;
    
    try {
      const templateData = {
        name: templateName.trim(),
        orientation,
        elements,
        background,
        watermark,
      };

      const res = await fetch(`/api/templates/${currentTemplateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData),
      });

      if (res.ok) {
        setLastAutoSave(new Date());
        setHasUnsavedChanges(false);
        console.log("Template auto-saved at", new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Auto-save error:", err);
    }
  }

  // Track unsaved changes
  useEffect(() => {
    if (currentTemplateId) {
      setHasUnsavedChanges(true);
    }
  }, [elements, background, watermark, orientation]);

  // Save on page leave (beforeunload) - uses refs to avoid stale closures
  useEffect(() => {
    templateDataRef.current = { currentTemplateId, templateName, orientation, elements, background, watermark, hasUnsavedChanges };
  }, [currentTemplateId, templateName, orientation, elements, background, watermark, hasUnsavedChanges]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const { currentTemplateId: id, templateName: name, orientation: orient, elements: els, background: bg, watermark: wm, hasUnsavedChanges: unsaved } = templateDataRef.current;
      
      if (id && unsaved && name.trim()) {
        // Use sendBeacon for reliable save on page leave
        const templateData = {
          name: name.trim(),
          orientation: orient,
          elements: els,
          background: bg,
          watermark: wm,
        };
        
        navigator.sendBeacon(
          `/api/templates/${id}`,
          new Blob([JSON.stringify(templateData)], { type: 'application/json' })
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const canvasWidth = orientation === "landscape" ? CANVAS_WIDTH_LANDSCAPE : CANVAS_HEIGHT_LANDSCAPE;
  const canvasHeight = orientation === "landscape" ? CANVAS_HEIGHT_LANDSCAPE : CANVAS_WIDTH_LANDSCAPE;
  const displayWidth = canvasWidth * SCALE_FACTOR;
  const displayHeight = canvasHeight * SCALE_FACTOR;

  const selectedElement = elements.find(el => el.id === selectedId);

  const getDefaultElement = (type: string, x: number, y: number): CanvasElement => {
    const baseElement = {
      id: Date.now(),
      x,
      y,
      width: 300,
      height: 150,
    };

    switch (type) {
      case "Text":
        return { ...baseElement, type: "Text", content: "Enter text here", fontSize: 24, color: "#000000", textAlign: "left", textType: "paragraph", fontFamily: "Inter", bold: false, italic: false, underline: false, language: "en" };
      case "Image":
        return { ...baseElement, type: "Image", content: "", width: 300, height: 150 };
      case "Video":
        return { ...baseElement, type: "Video", content: "", width: 400, height: 225 };
      case "RSS":
        return { ...baseElement, type: "RSS", content: "", width: 350, height: 200 };
      case "Ticker":
        return { ...baseElement, type: "Ticker", content: "", width: 500, height: 300, tickerMode: "live", tickerSpeed: 20, tickerRefreshRate: 5 };
      case "Pricing":
        return { ...baseElement, type: "Pricing", content: "", width: 400, height: 300, tickerMode: "live", tickerRefreshRate: 10 };
      case "Social":
        return { ...baseElement, type: "Social", content: "@username", width: 350, height: 200 };
      case "Playlist":
        return { ...baseElement, type: "Playlist", content: "My Playlist", width: 400, height: 250 };
      case "DateTime":
        return { ...baseElement, type: "DateTime", content: "Time & Date", width: 300, height: 80, fontSize: 32, color: "#000000", dateFormat: "HH:mm" };
      default:
        return { ...baseElement, type: "Text", content: "Unknown" };
    }
  };

  const handleToolbarDragStart = (e: DragEvent, type: string) => {
    setDraggedType(type);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleCanvasDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedType ? "copy" : "move";
  };

  const handleCanvasDrop = (e: DragEvent) => {
    e.preventDefault();
    if (!draggedType || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = snapValue(Math.round((e.clientX - rect.left) / SCALE_FACTOR));
    const y = snapValue(Math.round((e.clientY - rect.top) / SCALE_FACTOR));

    const newElement = getDefaultElement(draggedType, x, y);
    setElements([...elements, newElement]);
    setSelectedId(newElement.id);
    setDraggedType(null);
  };

  const handleElementDrag = (e: DragEvent, elementId: number) => {
    e.stopPropagation();
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    e.dataTransfer.setData("elementId", String(elementId));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleElementDrop = (e: DragEvent) => {
    const elementIdStr = e.dataTransfer.getData("elementId");
    if (!elementIdStr || !canvasRef.current) return;

    e.preventDefault();
    const elementId = parseInt(elementIdStr);
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = Math.round((e.clientX - rect.left) / SCALE_FACTOR);
    const rawY = Math.round((e.clientY - rect.top) / SCALE_FACTOR);
    
    const element = elements.find(el => el.id === elementId);
    if (!element) return;
    
    const x = snapValue(Math.max(0, rawX - element.width / 2));
    const y = snapValue(Math.max(0, rawY - element.height / 2));

    setElements(elements.map(el =>
      el.id === elementId ? { ...el, x, y } : el
    ));
  };

  const updateElement = (id: number, updates: Partial<CanvasElement>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const deleteElement = (id: number) => {
    setElements(elements.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: number } | null>(null);

  // Keyboard delete handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId !== null) {
        // Don't delete if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        e.preventDefault();
        deleteElement(selectedId);
      }
      // Close context menu on Escape
      if (e.key === "Escape") {
        setContextMenu(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, elements]);

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, elementId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(elementId);
    setContextMenu({ x: e.clientX, y: e.clientY, elementId });
  };

  const toggleOrientation = () => {
    setOrientation(orientation === "landscape" ? "portrait" : "landscape");
  };

  const handleResizeStart = (e: MouseEvent, elementId: number, handle: ResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    setResizing({
      elementId,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: element.width,
      startHeight: element.height,
      startElX: element.x,
      startElY: element.y,
    });
    setSelectedId(elementId);
    setEditingPanel("element");
  };

  const handleResizeMove = useCallback((e: globalThis.MouseEvent) => {
    if (!resizing) return;

    const deltaX = (e.clientX - resizing.startX) / SCALE_FACTOR;
    const deltaY = (e.clientY - resizing.startY) / SCALE_FACTOR;

    let newWidth = resizing.startWidth;
    let newHeight = resizing.startHeight;
    let newX = resizing.startElX;
    let newY = resizing.startElY;

    const minSize = 50;

    if (resizing.handle?.includes("e")) {
      newWidth = Math.max(minSize, resizing.startWidth + deltaX);
    }
    if (resizing.handle?.includes("w")) {
      const widthChange = Math.min(deltaX, resizing.startWidth - minSize);
      newWidth = resizing.startWidth - widthChange;
      newX = resizing.startElX + widthChange;
    }
    if (resizing.handle?.includes("s")) {
      newHeight = Math.max(minSize, resizing.startHeight + deltaY);
    }
    if (resizing.handle?.includes("n")) {
      const heightChange = Math.min(deltaY, resizing.startHeight - minSize);
      newHeight = resizing.startHeight - heightChange;
      newY = resizing.startElY + heightChange;
    }

    setElements(elements.map(el =>
      el.id === resizing.elementId
        ? { ...el, width: snapValue(Math.round(newWidth)), height: snapValue(Math.round(newHeight)), x: snapValue(Math.round(newX)), y: snapValue(Math.round(newY)) }
        : el
    ));
  }, [resizing, elements]);

  const handleResizeEnd = useCallback(() => {
    setResizing(null);
  }, []);

  useEffect(() => {
    if (resizing) {
      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("mouseup", handleResizeEnd);
      return () => {
        window.removeEventListener("mousemove", handleResizeMove);
        window.removeEventListener("mouseup", handleResizeEnd);
      };
    }
  }, [resizing, handleResizeMove, handleResizeEnd]);

  const resizeHandles: { handle: ResizeHandle; position: string; cursor: string }[] = [
    { handle: "n", position: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2", cursor: "ns-resize" },
    { handle: "s", position: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2", cursor: "ns-resize" },
    { handle: "e", position: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2", cursor: "ew-resize" },
    { handle: "w", position: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2", cursor: "ew-resize" },
    { handle: "ne", position: "top-0 right-0 translate-x-1/2 -translate-y-1/2", cursor: "nesw-resize" },
    { handle: "nw", position: "top-0 left-0 -translate-x-1/2 -translate-y-1/2", cursor: "nwse-resize" },
    { handle: "se", position: "bottom-0 right-0 translate-x-1/2 translate-y-1/2", cursor: "nwse-resize" },
    { handle: "sw", position: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2", cursor: "nesw-resize" },
  ];

  const toolbarItems = [
    { type: "Text", icon: Type, label: "Text" },
    { type: "Image", icon: Image, label: "Image" },
    { type: "Video", icon: Video, label: "Video" },
    { type: "Playlist", icon: ListMusic, label: "Playlist" },
    { type: "DateTime", icon: Clock, label: "Time/Date" },
    { type: "RSS", icon: Rss, label: "RSS Feed" },
    { type: "Ticker", icon: Type, label: "Web Ticker" },
    { type: "Pricing", icon: DollarSign, label: "Pricing Widget" },
    { type: "Social", icon: Share2, label: "Social Feed" },
  ];

  return (
    <div className="p-4 flex flex-col bg-slate-50" style={{ minHeight: "600px", height: "calc(100vh - 140px)" }}>
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Template Designer</h1>
        <div className="flex gap-2 items-center">
          {/* Snap to Grid Controls */}
          <div className="flex items-center gap-2 mr-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg">
            <Grid size={16} className={snapToGrid ? "text-blue-600" : "text-slate-400"} />
            <span className="text-sm text-slate-600">Snap</span>
            <Switch
              checked={snapToGrid}
              onCheckedChange={setSnapToGrid}
              data-testid="toggle-snap"
            />
            {snapToGrid && (
              <Select value={String(gridSize)} onValueChange={(v) => setGridSize(parseInt(v))}>
                <SelectTrigger className="h-7 w-16 text-xs" data-testid="grid-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10px</SelectItem>
                  <SelectItem value="20">20px</SelectItem>
                  <SelectItem value="40">40px</SelectItem>
                  <SelectItem value="50">50px</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          <Button variant="outline" onClick={toggleOrientation} data-testid="toggle-orientation">
            <RotateCcw size={18} className="mr-2" />
            {orientation === "landscape" ? "Portrait" : "Landscape"}
          </Button>
          {/* Auto-save status indicator */}
          {currentTemplateId && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-sm">
              <span className="font-medium text-slate-700">{templateName}</span>
              {hasUnsavedChanges ? (
                <span className="text-amber-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  Unsaved
                </span>
              ) : lastAutoSave ? (
                <span className="text-green-600 flex items-center gap-1">
                  <Check size={14} />
                  Saved {lastAutoSave.toLocaleTimeString()}
                </span>
              ) : (
                <span className="text-green-600 flex items-center gap-1">
                  <Check size={14} />
                  Saved
                </span>
              )}
            </div>
          )}
          
          <Button variant="outline" onClick={() => { loadSavedTemplates(); setShowLoadDialog(true); }} data-testid="load-button">
            <FolderOpen size={18} className="mr-2" /> Load
          </Button>
          <Button 
            variant="default" 
            className="bg-blue-600 hover:bg-blue-700" 
            onClick={() => {
              if (currentTemplateId && hasUnsavedChanges) {
                autoSaveTemplate();
              } else {
                setShowSaveDialog(true);
              }
            }} 
            data-testid="save-button"
          >
            <Save size={18} className="mr-2" /> {currentTemplateId ? "Save" : "Save As"}
          </Button>
          <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => setShowPreview(true)} data-testid="preview-button">
            <Play size={18} className="mr-2" /> Preview
          </Button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* LEFT TOOLBAR */}
        <div className="w-40 bg-white border border-slate-200 rounded-lg shadow-sm p-3 flex flex-col gap-2">
          <h2 className="font-semibold text-sm text-slate-700 mb-2">Elements</h2>
          {toolbarItems.map(item => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => handleToolbarDragStart(e, item.type)}
              className="flex items-center gap-2 p-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-grab active:cursor-grabbing text-sm text-slate-700 transition-colors"
              data-testid={`toolbar-${item.type.toLowerCase()}`}
            >
              <item.icon size={16} />
              {item.label}
            </div>
          ))}

          <div className="border-t border-slate-200 my-2" />
          <h2 className="font-semibold text-sm text-slate-700 mb-1">Canvas Settings</h2>
          
          <button
            onClick={() => { setSelectedId(null); setEditingPanel("background"); }}
            className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${editingPanel === "background" ? "bg-blue-100 text-blue-700" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}
            data-testid="toolbar-background"
          >
            <Palette size={16} />
            Background
          </button>
          
          <button
            onClick={() => { setSelectedId(null); setEditingPanel("watermark"); }}
            className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${editingPanel === "watermark" ? "bg-blue-100 text-blue-700" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}
            data-testid="toolbar-watermark"
          >
            <Droplets size={16} />
            Watermark
          </button>
        </div>

        {/* CANVAS AREA */}
        <div className="flex-1 bg-slate-100 rounded-lg p-4 flex items-start justify-center overflow-auto">
          <div className="relative">
            {/* X-Axis Labels */}
            <div className="absolute -top-5 left-0 flex text-xs text-slate-500" style={{ width: displayWidth }}>
              {(orientation === "landscape" 
                ? [0, 480, 960, 1440, 1920] 
                : [0, 270, 540, 810, 1080]
              ).filter(v => v <= canvasWidth).map(val => (
                <span key={val} className="absolute" style={{ left: val * SCALE_FACTOR - 10 }}>{val}</span>
              ))}
            </div>

            {/* Y-Axis Labels */}
            <div className="absolute -left-8 top-0 flex flex-col text-xs text-slate-500" style={{ height: displayHeight }}>
              {(orientation === "landscape" 
                ? [0, 270, 540, 810, 1080] 
                : [0, 480, 960, 1440, 1920]
              ).filter(v => v <= canvasHeight).map(val => (
                <span key={val} className="absolute" style={{ top: val * SCALE_FACTOR - 6 }}>{val}</span>
              ))}
            </div>

            {/* Canvas */}
            <div
              ref={canvasRef}
              className="border-2 border-slate-300 relative overflow-hidden"
              style={{
                width: displayWidth,
                height: displayHeight,
                backgroundColor: background.type === "color" ? background.color : undefined,
              }}
              onDragOver={handleCanvasDragOver}
              onDrop={(e) => {
                if (draggedType) handleCanvasDrop(e);
                else handleElementDrop(e);
              }}
              onClick={() => { setSelectedId(null); setEditingPanel("element"); }}
              data-testid="canvas"
            >
              {/* Grid Overlay */}
              {snapToGrid && (
                <div 
                  className="absolute inset-0 pointer-events-none z-0 opacity-30"
                  style={{
                    backgroundImage: `linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)`,
                    backgroundSize: `${gridSize * SCALE_FACTOR}px ${gridSize * SCALE_FACTOR}px`,
                  }}
                />
              )}
              
              {/* Background Layer (z-index: 0) */}
              {background.type === "image" && background.imageUrl && (
                <div 
                  className="absolute inset-0 z-0"
                  style={{
                    backgroundImage: `url(${background.imageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              )}
              {background.type === "video" && background.videoUrl && (
                <video
                  className="absolute inset-0 z-0 w-full h-full object-cover"
                  src={background.videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              )}

              {/* Grid Overlay (z-index: 1) */}
              <div 
                className="absolute inset-0 z-[1] pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
                  `,
                  backgroundSize: `${50 * SCALE_FACTOR}px ${50 * SCALE_FACTOR}px`,
                }}
              />

              {/* Canvas Size Indicator */}
              <div className="absolute bottom-1 right-1 text-xs text-slate-400 bg-white/80 px-1 rounded z-[50]">
                {canvasWidth} × {canvasHeight}
              </div>

              {/* Elements (z-index: 10) */}
              {elements.map(el => (
                <div
                  key={el.id}
                  draggable
                  onDragStart={(e) => handleElementDrag(e, el.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(el.id);
                    setEditingPanel("element");
                  }}
                  onContextMenu={(e) => handleContextMenu(e, el.id)}
                  className={`absolute cursor-move z-10 ${selectedId === el.id ? 'ring-2 ring-blue-500' : 'hover:ring-2 hover:ring-blue-300'}`}
                  style={{
                    left: el.x * SCALE_FACTOR,
                    top: el.y * SCALE_FACTOR,
                    width: el.width * SCALE_FACTOR,
                    height: el.height * SCALE_FACTOR,
                  }}
                  data-testid={`element-${el.id}`}
                >
                  <div className={`w-full h-full border border-slate-300 rounded overflow-hidden ${el.type === "Image" || el.type === "Video" ? "" : "bg-white/90 flex items-center justify-center p-1"}`}>
                    {el.type === "Text" && (
                      <div
                        className="w-full h-full flex items-center overflow-hidden"
                        style={{ 
                          fontSize: (el.fontSize || 16) * SCALE_FACTOR, 
                          color: el.color,
                          fontFamily: el.fontFamily || "Inter",
                          fontWeight: el.bold ? "bold" : "normal",
                          fontStyle: el.italic ? "italic" : "normal",
                          textDecoration: el.underline ? "underline" : "none",
                          textAlign: el.textAlign || "left",
                          justifyContent: el.textAlign === "center" ? "center" : el.textAlign === "right" ? "flex-end" : "flex-start",
                          direction: el.language === "ar" ? "rtl" : "ltr",
                        }}
                      >
                        <span className="truncate px-1">{el.content}</span>
                      </div>
                    )}
                    {el.type === "Image" && (
                      el.content ? (
                        <img 
                          src={el.content} 
                          alt="Element" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-200 flex flex-col items-center justify-center text-slate-500">
                          <Image size={32} />
                          <span className="text-xs mt-1">Select Image</span>
                        </div>
                      )
                    )}
                    {el.type === "Video" && (
                      el.content ? (
                        <video 
                          src={el.content} 
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center text-white">
                          <Video size={32} />
                          <span className="text-xs mt-1">Select Video</span>
                        </div>
                      )
                    )}
                    {el.type === "RSS" && (
                      <div className="w-full h-full bg-orange-50 flex flex-col items-center justify-center text-orange-600 text-xs">
                        <Rss size={16} className="mb-1" />
                        {el.content ? (
                          <span className="truncate max-w-full px-2">{el.content}</span>
                        ) : (
                          <span>Enter RSS URL in Properties</span>
                        )}
                      </div>
                    )}
                    {el.type === "Ticker" && (
                      <div className="w-full h-full bg-gradient-to-r from-cyan-50 to-blue-50 flex flex-col items-center justify-center text-cyan-700 text-xs p-2">
                        <Type size={16} className="mb-1" />
                        <span className="text-[10px] font-medium uppercase tracking-wide opacity-70 mb-1">
                          {el.tickerMode === "live" ? `Live (${el.tickerRefreshRate || 5}s)` : 
                           el.tickerMode === "screenshot" ? "Screenshot" : 
                           el.tickerMode === "text" ? "Text Ticker" : "Embed"}
                        </span>
                        {el.content ? (
                          <span className="truncate max-w-full px-1 text-center">{el.content}</span>
                        ) : (
                          <span>Enter Webpage URL</span>
                        )}
                      </div>
                    )}
                    {el.type === "Pricing" && (
                      <div className="w-full h-full bg-gradient-to-r from-green-50 to-emerald-50 flex flex-col items-center justify-center text-green-700 text-xs p-2">
                        <DollarSign size={16} className="mb-1" />
                        <span className="text-[10px] font-medium uppercase tracking-wide opacity-70 mb-1">
                          {el.tickerMode === "live" ? `Live (${el.tickerRefreshRate || 10}s)` : 
                           el.tickerMode === "screenshot" ? "Screenshot" : "Embed"}
                        </span>
                        {el.content ? (
                          <span className="truncate max-w-full px-1 text-center">{el.content}</span>
                        ) : (
                          <span>Enter Pricing URL</span>
                        )}
                      </div>
                    )}
                    {el.type === "Social" && (
                      <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-600 text-xs">
                        <Share2 size={16} className="mr-1" /> {el.content}
                      </div>
                    )}
                    {el.type === "Playlist" && (
                      <div className="w-full h-full bg-purple-50 flex items-center justify-center text-purple-600 text-xs">
                        <ListMusic size={16} className="mr-1" /> {el.content}
                      </div>
                    )}
                    {el.type === "DateTime" && (
                      <div 
                        className="w-full h-full bg-gradient-to-r from-blue-50 to-cyan-50 flex items-center justify-center"
                        style={{ fontSize: (el.fontSize || 24) * SCALE_FACTOR, color: el.color }}
                      >
                        <span>{formatDateTime(el.dateFormat || "HH:mm", currentTime)}</span>
                      </div>
                    )}
                  </div>

                  {/* Position indicator */}
                  {selectedId === el.id && (
                    <div className="absolute -top-5 left-0 text-xs bg-blue-500 text-white px-1 rounded">
                      {el.x}, {el.y} | {el.width}×{el.height}
                    </div>
                  )}

                  {/* Resize handles - only show when selected */}
                  {selectedId === el.id && resizeHandles.map(({ handle, position, cursor }) => (
                    <div
                      key={handle}
                      className={`absolute ${position} w-3 h-3 bg-blue-500 border border-white rounded-sm z-20`}
                      style={{ cursor }}
                      onMouseDown={(e) => handleResizeStart(e, el.id, handle)}
                      data-testid={`resize-${handle}-${el.id}`}
                    />
                  ))}
                </div>
              ))}

              {/* Watermark Layer (z-index: 20 - on top of elements) */}
              {watermark.enabled && (
                <div 
                  className="absolute z-20 pointer-events-none"
                  style={{
                    opacity: watermark.opacity / 100,
                    ...(watermark.position === "top-left" && { top: 20 * SCALE_FACTOR, left: 20 * SCALE_FACTOR }),
                    ...(watermark.position === "top-right" && { top: 20 * SCALE_FACTOR, right: 20 * SCALE_FACTOR }),
                    ...(watermark.position === "bottom-left" && { bottom: 20 * SCALE_FACTOR, left: 20 * SCALE_FACTOR }),
                    ...(watermark.position === "bottom-right" && { bottom: 20 * SCALE_FACTOR, right: 20 * SCALE_FACTOR }),
                    ...(watermark.position === "center" && { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }),
                  }}
                >
                  {watermark.type === "text" ? (
                    <span 
                      className="font-bold text-white"
                      style={{ 
                        fontSize: watermark.size * SCALE_FACTOR,
                        textShadow: "2px 2px 4px rgba(0,0,0,0.5)"
                      }}
                    >
                      {watermark.text}
                    </span>
                  ) : watermark.imageUrl ? (
                    <img 
                      src={watermark.imageUrl} 
                      alt="Watermark" 
                      style={{ 
                        height: watermark.size * SCALE_FACTOR,
                        maxWidth: 300 * SCALE_FACTOR
                      }}
                    />
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PROPERTIES PANEL */}
        <div className="w-64 bg-white border border-slate-200 rounded-lg shadow-sm p-4 overflow-y-auto">
          <h2 className="font-semibold text-sm text-slate-700 mb-4">Properties</h2>

          {/* ELEMENT PROPERTIES */}
          {editingPanel === "element" && selectedElement && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                {selectedElement.type} Element
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">X Position</Label>
                  <Input
                    type="number"
                    value={selectedElement.x}
                    onChange={(e) => updateElement(selectedElement.id, { x: parseInt(e.target.value) || 0 })}
                    className="h-8 text-sm"
                    data-testid="prop-x"
                  />
                </div>
                <div>
                  <Label className="text-xs">Y Position</Label>
                  <Input
                    type="number"
                    value={selectedElement.y}
                    onChange={(e) => updateElement(selectedElement.id, { y: parseInt(e.target.value) || 0 })}
                    className="h-8 text-sm"
                    data-testid="prop-y"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Width</Label>
                  <Input
                    type="number"
                    value={selectedElement.width}
                    onChange={(e) => updateElement(selectedElement.id, { width: parseInt(e.target.value) || 100 })}
                    className="h-8 text-sm"
                    data-testid="prop-width"
                  />
                </div>
                <div>
                  <Label className="text-xs">Height</Label>
                  <Input
                    type="number"
                    value={selectedElement.height}
                    onChange={(e) => updateElement(selectedElement.id, { height: parseInt(e.target.value) || 100 })}
                    className="h-8 text-sm"
                    data-testid="prop-height"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Content</Label>
                {selectedElement.type === "Text" ? (
                  <textarea
                    value={selectedElement.content}
                    onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                    className="w-full h-20 text-sm border border-slate-200 rounded p-2 mt-1"
                    data-testid="prop-content"
                  />
                ) : (
                  <Input
                    value={selectedElement.content}
                    onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                    placeholder={selectedElement.type === "Image" ? "Image URL" : selectedElement.type === "Video" ? "Video URL" : selectedElement.type === "RSS" ? "RSS Feed URL (e.g., https://rss.nytimes.com/...)" : selectedElement.type === "Ticker" ? "Webpage URL (e.g., https://example.com/prices)" : selectedElement.type === "Pricing" ? "Pricing page URL (e.g., https://example.com/pricing)" : "Content"}
                    className="h-8 text-sm mt-1"
                    data-testid="prop-content"
                  />
                )}
              </div>

              {/* Ticker Mode Options */}
              {selectedElement.type === "Ticker" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-slate-600">Display Mode</Label>
                    <Select
                      value={selectedElement.tickerMode || "iframe"}
                      onValueChange={(value) => updateElement(selectedElement.id, { tickerMode: value as "text" | "iframe" | "screenshot" })}
                    >
                      <SelectTrigger className="h-8 text-sm mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="live">Live Capture (auto-refresh)</SelectItem>
                        <SelectItem value="screenshot">Screenshot (static)</SelectItem>
                        <SelectItem value="iframe">Direct Embed (may be blocked)</SelectItem>
                        <SelectItem value="text">Scrolling Text</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedElement.tickerMode === "live" && "Captures live screenshots that auto-refresh"}
                      {selectedElement.tickerMode === "screenshot" && "Captures a single screenshot of the webpage"}
                      {selectedElement.tickerMode === "iframe" && "Embeds the webpage directly (blocked by most sites)"}
                      {selectedElement.tickerMode === "text" && "Extracts text and shows as scrolling ticker"}
                    </p>
                  </div>
                  {selectedElement.tickerMode === "text" && (
                    <div>
                      <Label className="text-xs text-slate-600">Scroll Speed</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Slider
                          value={[selectedElement.tickerSpeed || 20]}
                          onValueChange={([value]) => updateElement(selectedElement.id, { tickerSpeed: value })}
                          min={5}
                          max={60}
                          step={5}
                          className="flex-1"
                        />
                        <span className="text-xs text-slate-500 w-8">{selectedElement.tickerSpeed || 20}s</span>
                      </div>
                    </div>
                  )}
                  {selectedElement.tickerMode === "live" && (
                    <div>
                      <Label className="text-xs text-slate-600">Refresh Rate</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Slider
                          value={[selectedElement.tickerRefreshRate || 5]}
                          onValueChange={([value]) => updateElement(selectedElement.id, { tickerRefreshRate: value })}
                          min={2}
                          max={30}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-xs text-slate-500 w-12">{selectedElement.tickerRefreshRate || 5}s</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Updates every {selectedElement.tickerRefreshRate || 5} seconds</p>
                    </div>
                  )}
                </div>
              )}

              {/* Pricing Widget Options */}
              {selectedElement.type === "Pricing" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-slate-600">Display Mode</Label>
                    <Select
                      value={selectedElement.tickerMode || "live"}
                      onValueChange={(value) => updateElement(selectedElement.id, { tickerMode: value as "iframe" | "screenshot" | "live" })}
                    >
                      <SelectTrigger className="h-8 text-sm mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="live">Live Capture (auto-refresh)</SelectItem>
                        <SelectItem value="screenshot">Screenshot (static)</SelectItem>
                        <SelectItem value="iframe">Direct Embed (may be blocked)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedElement.tickerMode === "live" && "Captures live pricing data that auto-refreshes"}
                      {selectedElement.tickerMode === "screenshot" && "Captures a single screenshot of the pricing page"}
                      {(selectedElement.tickerMode === "iframe" || !selectedElement.tickerMode) && "Embeds the pricing page directly"}
                    </p>
                  </div>
                  {selectedElement.tickerMode === "live" && (
                    <div>
                      <Label className="text-xs text-slate-600">Refresh Rate</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Slider
                          value={[selectedElement.tickerRefreshRate || 10]}
                          onValueChange={([value]) => updateElement(selectedElement.id, { tickerRefreshRate: value })}
                          min={2}
                          max={60}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-xs text-slate-500 w-12">{selectedElement.tickerRefreshRate || 10}s</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Updates pricing every {selectedElement.tickerRefreshRate || 10} seconds</p>
                    </div>
                  )}
                </div>
              )}

              {/* Playlist Selection */}
              {selectedElement.type === "Playlist" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-slate-600">Select Playlist</Label>
                    <Select
                      value={selectedElement.playlistId?.toString() || ""}
                      onValueChange={(value) => {
                        const playlist = contentPlaylists.find(p => p.id === parseInt(value));
                        updateElement(selectedElement.id, { 
                          playlistId: parseInt(value),
                          content: playlist?.name || ""
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm mt-1" data-testid="playlist-select">
                        <SelectValue placeholder="Choose a playlist..." />
                      </SelectTrigger>
                      <SelectContent>
                        {contentPlaylists.length === 0 ? (
                          <SelectItem value="none" disabled>No playlists created yet</SelectItem>
                        ) : (
                          contentPlaylists.map((playlist) => (
                            <SelectItem key={playlist.id} value={playlist.id.toString()}>
                              {playlist.name} ({playlist.item_count} items)
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedElement.playlistId 
                        ? `Selected: ${contentPlaylists.find(p => p.id === selectedElement.playlistId)?.name || 'Unknown'}`
                        : "Create playlists in the Content section"}
                    </p>
                  </div>
                </div>
              )}

              {/* Upload options for Image/Video */}
              {(selectedElement.type === "Image" || selectedElement.type === "Video") && (
                <div className="space-y-2">
                  <input
                    ref={elementFileInputRef}
                    type="file"
                    accept={selectedElement.type === "Image" ? "image/*" : "video/*"}
                    onChange={handleElementUpload}
                    className="hidden"
                    data-testid="input-element-upload"
                  />
                  <Button
                    onClick={() => elementFileInputRef.current?.click()}
                    disabled={uploadingElement}
                    className="w-full"
                    variant="outline"
                    data-testid="button-upload-element"
                  >
                    {uploadingElement ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4 mr-2" />
                        Upload from Computer
                      </>
                    )}
                  </Button>
                  
                  {/* Media Library Picker */}
                  <div>
                    <Label className="text-xs">Or choose from Media Library</Label>
                    <Select 
                      value="" 
                      onValueChange={(url) => updateElement(selectedElement.id, { content: url })}
                    >
                      <SelectTrigger className="h-8 text-sm mt-1" data-testid="media-library-picker">
                        <SelectValue placeholder="Select media..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mediaLibrary
                          .filter(m => selectedElement.type === "Image" ? m.type === "image" : m.type === "video")
                          .map((media) => (
                            <SelectItem key={media.id} value={media.url}>
                              {media.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {selectedElement.type === "Text" && (
                <>
                  {/* Text Alignment */}
                  <div>
                    <Label className="text-xs">Text Alignment</Label>
                    <div className="flex gap-1 mt-1">
                      <Button
                        variant={selectedElement.textAlign === "left" ? "default" : "outline"}
                        size="sm"
                        className="flex-1 h-8"
                        onClick={() => updateElement(selectedElement.id, { textAlign: "left" })}
                        data-testid="align-left"
                      >
                        <AlignLeft size={14} />
                      </Button>
                      <Button
                        variant={selectedElement.textAlign === "center" ? "default" : "outline"}
                        size="sm"
                        className="flex-1 h-8"
                        onClick={() => updateElement(selectedElement.id, { textAlign: "center" })}
                        data-testid="align-center"
                      >
                        <AlignCenter size={14} />
                      </Button>
                      <Button
                        variant={selectedElement.textAlign === "right" ? "default" : "outline"}
                        size="sm"
                        className="flex-1 h-8"
                        onClick={() => updateElement(selectedElement.id, { textAlign: "right" })}
                        data-testid="align-right"
                      >
                        <AlignRight size={14} />
                      </Button>
                    </div>
                  </div>

                  {/* Text Type */}
                  <div>
                    <Label className="text-xs">Text Type</Label>
                    <Select 
                      value={selectedElement.textType || "paragraph"} 
                      onValueChange={(val: any) => updateElement(selectedElement.id, { textType: val })}
                    >
                      <SelectTrigger className="h-8 text-sm mt-1" data-testid="prop-texttype">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paragraph">Paragraph</SelectItem>
                        <SelectItem value="heading1">Heading 1</SelectItem>
                        <SelectItem value="heading2">Heading 2</SelectItem>
                        <SelectItem value="heading3">Heading 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Font Family */}
                  <div>
                    <Label className="text-xs">Font</Label>
                    <Select 
                      value={selectedElement.fontFamily || "Inter"} 
                      onValueChange={(val) => updateElement(selectedElement.id, { fontFamily: val })}
                    >
                      <SelectTrigger className="h-8 text-sm mt-1" data-testid="prop-font">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map((font) => (
                          <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                            {font.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Font Size */}
                  <div>
                    <Label className="text-xs">Font Size</Label>
                    <Select 
                      value={String(selectedElement.fontSize || 24)} 
                      onValueChange={(val) => updateElement(selectedElement.id, { fontSize: parseInt(val) })}
                    >
                      <SelectTrigger className="h-8 text-sm mt-1" data-testid="prop-fontsize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_SIZE_OPTIONS.map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size}px
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bold, Italic, Underline */}
                  <div>
                    <Label className="text-xs">Style</Label>
                    <div className="flex gap-1 mt-1">
                      <Button
                        variant={selectedElement.bold ? "default" : "outline"}
                        size="sm"
                        className="flex-1 h-8"
                        onClick={() => updateElement(selectedElement.id, { bold: !selectedElement.bold })}
                        data-testid="style-bold"
                      >
                        <Bold size={14} />
                      </Button>
                      <Button
                        variant={selectedElement.italic ? "default" : "outline"}
                        size="sm"
                        className="flex-1 h-8"
                        onClick={() => updateElement(selectedElement.id, { italic: !selectedElement.italic })}
                        data-testid="style-italic"
                      >
                        <Italic size={14} />
                      </Button>
                      <Button
                        variant={selectedElement.underline ? "default" : "outline"}
                        size="sm"
                        className="flex-1 h-8"
                        onClick={() => updateElement(selectedElement.id, { underline: !selectedElement.underline })}
                        data-testid="style-underline"
                      >
                        <Underline size={14} />
                      </Button>
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <Label className="text-xs">Color</Label>
                    <Input
                      type="color"
                      value={selectedElement.color || "#000000"}
                      onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                      className="h-8 w-full mt-1"
                      data-testid="prop-color"
                    />
                  </div>

                  {/* Language */}
                  <div>
                    <Label className="text-xs">Language</Label>
                    <Select 
                      value={selectedElement.language || "en"} 
                      onValueChange={(val: any) => updateElement(selectedElement.id, { language: val })}
                    >
                      <SelectTrigger className="h-8 text-sm mt-1" data-testid="prop-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English (LTR)</SelectItem>
                        <SelectItem value="ar">Arabic (RTL)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {selectedElement.type === "DateTime" && (
                <>
                  <div>
                    <Label className="text-xs">Date/Time Format</Label>
                    <Select 
                      value={selectedElement.dateFormat || "HH:mm"} 
                      onValueChange={(val) => updateElement(selectedElement.id, { dateFormat: val })}
                    >
                      <SelectTrigger className="h-8 text-sm mt-1" data-testid="prop-dateformat">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_FORMAT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Font Size</Label>
                    <Select 
                      value={String(selectedElement.fontSize || 32)} 
                      onValueChange={(val) => updateElement(selectedElement.id, { fontSize: parseInt(val) })}
                    >
                      <SelectTrigger className="h-8 text-sm mt-1" data-testid="prop-datetime-fontsize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_SIZE_OPTIONS.map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size}px
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Color</Label>
                    <Input
                      type="color"
                      value={selectedElement.color || "#000000"}
                      onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                      className="h-8 w-full mt-1"
                      data-testid="prop-datetime-color"
                    />
                  </div>
                </>
              )}

              <Button
                variant="destructive"
                size="sm"
                className="w-full mt-4"
                onClick={() => deleteElement(selectedElement.id)}
                data-testid="delete-element"
              >
                <Trash2 size={14} className="mr-2" /> Delete Element
              </Button>
            </div>
          )}

          {/* BACKGROUND PROPERTIES */}
          {editingPanel === "background" && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 bg-blue-100 px-2 py-1 rounded flex items-center gap-1">
                <Palette size={12} /> Background Settings
              </div>

              {/* Upload Button */}
              <div>
                <input
                  ref={bgFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleBgUpload}
                  className="hidden"
                  data-testid="input-bg-upload"
                />
                <Button
                  onClick={() => bgFileInputRef.current?.click()}
                  disabled={uploadingBg}
                  className="w-full"
                  variant="outline"
                  data-testid="button-upload-bg"
                >
                  {uploadingBg ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4 mr-2" />
                      Upload Image/Video
                    </>
                  )}
                </Button>
              </div>

              <div>
                <Label className="text-xs">Background Type</Label>
                <Select value={background.type} onValueChange={(val: "color" | "image" | "video") => setBackground({ ...background, type: val })}>
                  <SelectTrigger className="h-8 text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="color">Solid Color</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {background.type === "color" && (
                <div>
                  <Label className="text-xs">Background Color</Label>
                  <Input
                    type="color"
                    value={background.color}
                    onChange={(e) => setBackground({ ...background, color: e.target.value })}
                    className="h-10 w-full mt-1"
                    data-testid="bg-color"
                  />
                </div>
              )}

              {background.type === "image" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Image URL (or select from library)</Label>
                    <Input
                      value={background.imageUrl}
                      onChange={(e) => setBackground({ ...background, imageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="h-8 text-sm mt-1"
                      data-testid="bg-image-url"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-2 block">Select from Media Library</Label>
                    {loadingMedia ? (
                      <div className="text-xs text-slate-500">Loading media...</div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1 max-h-[200px] overflow-y-auto">
                        {mediaLibrary.filter(m => m.type === "image").map(media => (
                          <div
                            key={media.id}
                            onClick={() => setBackground({ ...background, imageUrl: media.url })}
                            className={`cursor-pointer rounded overflow-hidden border-2 transition-all aspect-video ${
                              background.imageUrl === media.url
                                ? "border-blue-500 ring-2 ring-blue-500/50"
                                : "border-transparent hover:border-slate-300"
                            }`}
                            data-testid={`bg-media-${media.id}`}
                          >
                            <img src={media.url} alt={media.name} className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {mediaLibrary.filter(m => m.type === "image").length === 0 && (
                          <div className="col-span-3 text-xs text-slate-400 text-center py-2">No images in library</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {background.type === "video" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Video URL (or select from library)</Label>
                    <Input
                      value={background.videoUrl}
                      onChange={(e) => setBackground({ ...background, videoUrl: e.target.value })}
                      placeholder="https://example.com/video.mp4"
                      className="h-8 text-sm mt-1"
                      data-testid="bg-video-url"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-2 block">Select from Media Library</Label>
                    {loadingMedia ? (
                      <div className="text-xs text-slate-500">Loading media...</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1 max-h-[200px] overflow-y-auto">
                        {mediaLibrary.filter(m => m.type === "video").map(media => (
                          <div
                            key={media.id}
                            onClick={() => setBackground({ ...background, videoUrl: media.url })}
                            className={`cursor-pointer rounded overflow-hidden border-2 transition-all p-2 ${
                              background.videoUrl === media.url
                                ? "border-blue-500 ring-2 ring-blue-500/50 bg-blue-50"
                                : "border-slate-200 hover:border-slate-300 bg-slate-100"
                            }`}
                            data-testid={`bg-video-${media.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <Video size={14} className="text-slate-600" />
                              <span className="text-xs truncate">{media.name}</span>
                            </div>
                          </div>
                        ))}
                        {mediaLibrary.filter(m => m.type === "video").length === 0 && (
                          <div className="col-span-2 text-xs text-slate-400 text-center py-2">No videos in library</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WATERMARK PROPERTIES */}
          {editingPanel === "watermark" && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 bg-blue-100 px-2 py-1 rounded flex items-center gap-1">
                <Droplets size={12} /> Watermark Settings
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">Enable Watermark</Label>
                <Switch
                  checked={watermark.enabled}
                  onCheckedChange={(checked) => setWatermark({ ...watermark, enabled: checked })}
                  data-testid="watermark-enabled"
                />
              </div>

              {watermark.enabled && (
                <>
                  <div>
                    <Label className="text-xs">Watermark Type</Label>
                    <Select value={watermark.type} onValueChange={(val: "text" | "image") => setWatermark({ ...watermark, type: val })}>
                      <SelectTrigger className="h-8 text-sm mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {watermark.type === "text" && (
                    <div>
                      <Label className="text-xs">Watermark Text</Label>
                      <Input
                        value={watermark.text}
                        onChange={(e) => setWatermark({ ...watermark, text: e.target.value })}
                        className="h-8 text-sm mt-1"
                        data-testid="watermark-text"
                      />
                    </div>
                  )}

                  {watermark.type === "image" && (
                    <div>
                      <Label className="text-xs">Image URL</Label>
                      <Input
                        value={watermark.imageUrl}
                        onChange={(e) => setWatermark({ ...watermark, imageUrl: e.target.value })}
                        placeholder="https://example.com/logo.png"
                        className="h-8 text-sm mt-1"
                        data-testid="watermark-image-url"
                      />
                    </div>
                  )}

                  <div>
                    <Label className="text-xs">Position</Label>
                    <Select value={watermark.position} onValueChange={(val: any) => setWatermark({ ...watermark, position: val })}>
                      <SelectTrigger className="h-8 text-sm mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top-left">Top Left</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Opacity: {watermark.opacity}%</Label>
                    <Slider
                      value={[watermark.opacity]}
                      onValueChange={([val]) => setWatermark({ ...watermark, opacity: val })}
                      min={5}
                      max={100}
                      step={5}
                      className="mt-2"
                      data-testid="watermark-opacity"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Size: {watermark.size}px</Label>
                    <Slider
                      value={[watermark.size]}
                      onValueChange={([val]) => setWatermark({ ...watermark, size: val })}
                      min={20}
                      max={200}
                      step={4}
                      className="mt-2"
                      data-testid="watermark-size"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* DEFAULT STATE */}
          {editingPanel === "element" && !selectedElement && (
            <div className="text-sm text-slate-500 text-center py-8">
              <Move size={32} className="mx-auto mb-2 opacity-50" />
              Drag elements from the left panel to the canvas, then click to edit properties
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
          data-testid="context-menu"
        >
          <button
            onClick={() => {
              deleteElement(contextMenu.elementId);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            data-testid="context-menu-delete"
          >
            <Trash2 size={14} />
            Delete Element
          </button>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {showPreview && (
        <div 
          className="fixed inset-0 bg-black z-[100] flex items-center justify-center"
          onClick={() => setShowPreview(false)}
          data-testid="preview-overlay"
        >
          <button
            onClick={() => setShowPreview(false)}
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 z-[101]"
            data-testid="close-preview"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div 
            className="relative"
            style={{
              width: orientation === "landscape" ? "100vw" : `${(1080 / 1920) * 100}vw`,
              height: orientation === "landscape" ? `${(1080 / 1920) * 100}vw` : "100vh",
              maxWidth: orientation === "landscape" ? "100vw" : `${(1080 / 1920) * 100}vh`,
              maxHeight: orientation === "landscape" ? `${(1080 / 1920) * 100}vw` : "100vh",
              backgroundColor: background.type === "color" ? background.color : "#000",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background */}
            {background.type === "image" && background.imageUrl && (
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${background.imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            )}
            {background.type === "video" && background.videoUrl && (
              <video
                className="absolute inset-0 w-full h-full object-cover"
                src={background.videoUrl}
                autoPlay
                loop
                muted
                playsInline
              />
            )}

            {/* Elements */}
            {elements.map((el) => {
              const scaleX = orientation === "landscape" 
                ? (typeof window !== "undefined" ? window.innerWidth / CANVAS_WIDTH_LANDSCAPE : 1)
                : (typeof window !== "undefined" ? window.innerHeight / CANVAS_WIDTH_LANDSCAPE : 1);
              const scaleY = scaleX;
              
              return (
                <div
                  key={el.id}
                  className="absolute"
                  style={{
                    left: el.x * scaleX,
                    top: el.y * scaleY,
                    width: el.width * scaleX,
                    height: el.height * scaleY,
                  }}
                >
                  {el.type === "Text" && (
                    <div
                      className="w-full h-full flex items-center"
                      style={{
                        fontSize: (el.fontSize || 24) * scaleX,
                        color: el.color,
                        fontFamily: el.fontFamily || "Inter",
                        fontWeight: el.bold ? "bold" : "normal",
                        fontStyle: el.italic ? "italic" : "normal",
                        textDecoration: el.underline ? "underline" : "none",
                        textAlign: el.textAlign || "left",
                        justifyContent: el.textAlign === "center" ? "center" : el.textAlign === "right" ? "flex-end" : "flex-start",
                        direction: el.language === "ar" ? "rtl" : "ltr",
                      }}
                    >
                      {el.content}
                    </div>
                  )}
                  {el.type === "Image" && (
                    <img src={el.content} alt="" className="w-full h-full object-cover" />
                  )}
                  {el.type === "Video" && (
                    <video
                      src={el.content}
                      className="w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  )}
                  {el.type === "DateTime" && (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        fontSize: (el.fontSize || 32) * scaleX,
                        color: el.color,
                      }}
                    >
                      {formatDateTime(el.dateFormat || "HH:mm", currentTime)}
                    </div>
                  )}
                  {el.type === "RSS" && (
                    <div
                      className="w-full h-full overflow-hidden p-2"
                      style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "white" }}
                    >
                      {!el.content || !el.content.startsWith("http") ? (
                        <div className="w-full h-full flex items-center justify-center text-white/60 text-sm">
                          <Rss size={20} className="mr-2" /> No RSS URL configured
                        </div>
                      ) : rssFeeds[el.content] === undefined ? (
                        <div className="w-full h-full flex items-center justify-center text-white/60 text-sm">
                          <Rss size={20} className="mr-2 animate-pulse" /> Loading RSS...
                        </div>
                      ) : rssFeeds[el.content].length === 0 ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white/60 text-sm text-center p-2">
                          <Rss size={20} className="mb-2" />
                          <span>Not a valid RSS feed</span>
                          <span className="text-xs mt-1">Try: feeds.bbci.co.uk/news/rss.xml</span>
                        </div>
                      ) : (
                        <div className="space-y-2 overflow-y-auto h-full" style={{ fontSize: Math.max(10, 14 * scaleX) }}>
                          {rssFeeds[el.content].slice(0, 5).map((item: { title: string; image?: string }, idx: number) => (
                            <div key={idx} className="border-b border-white/20 pb-2 flex gap-2">
                              {item.image && (
                                <img 
                                  src={item.image} 
                                  alt="" 
                                  className="w-12 h-12 object-cover rounded flex-shrink-0"
                                  onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                              )}
                              <p className="font-semibold line-clamp-2">{item.title}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {el.type === "Ticker" && (
                    <div className="w-full h-full overflow-hidden">
                      {!el.content || !el.content.startsWith("http") ? (
                        <div className="w-full h-full flex items-center justify-center text-white/60 text-sm bg-slate-800">
                          <Type size={20} className="mr-2" /> No URL configured
                        </div>
                      ) : (el.tickerMode) === "iframe" ? (
                        <iframe
                          src={el.content}
                          className="w-full h-full border-0"
                          title="Web Ticker"
                          sandbox="allow-scripts allow-same-origin"
                        />
                      ) : (el.tickerMode === "screenshot" || el.tickerMode === "live" || !el.tickerMode) ? (
                        tickerScreenshots[el.content] === "loading" ? (
                          <div className="w-full h-full flex items-center justify-center text-white/60 text-sm bg-slate-800">
                            <Type size={20} className="mr-2 animate-pulse" /> Capturing live view...
                          </div>
                        ) : tickerScreenshots[el.content] === "error" || !tickerScreenshots[el.content] ? (
                          <div className="w-full h-full flex items-center justify-center text-white/60 text-sm bg-slate-800">
                            <Type size={20} className="mr-2" /> Failed to capture
                          </div>
                        ) : (
                          <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                            <img 
                              src={tickerScreenshots[el.content]} 
                              alt="Webpage screenshot" 
                              className="w-full h-auto object-contain"
                              style={{ maxHeight: '100%' }}
                            />
                            {el.tickerMode === "live" && (
                              <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                LIVE
                              </div>
                            )}
                          </div>
                        )
                      ) : el.tickerMode === "text" ? (
                        // Text mode
                        <div
                          className="w-full h-full overflow-hidden flex items-center"
                          style={{ backgroundColor: el.backgroundColor || "rgba(0,0,0,0.8)", color: el.color || "white" }}
                        >
                          {tickerContent[el.content] === undefined ? (
                            <div className="w-full h-full flex items-center justify-center text-white/60 text-sm">
                              <Type size={20} className="mr-2 animate-pulse" /> Loading...
                            </div>
                          ) : tickerContent[el.content] === "" ? (
                            <div className="w-full h-full flex items-center justify-center text-white/60 text-sm">
                              <Type size={20} className="mr-2" /> No content found
                            </div>
                          ) : (
                            <div className="relative w-full h-full flex items-center overflow-hidden">
                              <div 
                                className="absolute whitespace-nowrap"
                                style={{ 
                                  fontSize: Math.max(12, (el.fontSize || 18) * scaleX),
                                  animation: `ticker ${el.tickerSpeed || 20}s linear infinite`,
                                }}
                              >
                                {tickerContent[el.content]} &nbsp;&nbsp;&nbsp;&nbsp; {tickerContent[el.content]}
                              </div>
                              <style>{`
                                @keyframes ticker {
                                  0% { transform: translateX(0); }
                                  100% { transform: translateX(-50%); }
                                }
                              `}</style>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                  {el.type === "Social" && (
                    <div className="w-full h-full bg-purple-900/80 flex items-center justify-center text-white text-sm">
                      <Share2 size={20} className="mr-2" /> Social Feed
                    </div>
                  )}
                  {el.type === "Playlist" && (
                    <div className="w-full h-full bg-slate-900 relative overflow-hidden">
                      {!el.playlistId ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white/60 text-sm bg-green-900/80">
                          <ListMusic size={24} className="mb-2" />
                          <span>No playlist selected</span>
                        </div>
                      ) : !playlistData[el.playlistId] ? (
                        <div className="w-full h-full flex items-center justify-center text-white/60 text-sm bg-green-900/80">
                          <ListMusic size={20} className="mr-2 animate-pulse" /> Loading playlist...
                        </div>
                      ) : playlistData[el.playlistId].length === 0 ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white/60 text-sm bg-green-900/80">
                          <ListMusic size={24} className="mb-2" />
                          <span>Playlist is empty</span>
                        </div>
                      ) : (() => {
                        const items = playlistData[el.playlistId!];
                        const currentIndex = playlistIndices[el.playlistId!] || 0;
                        const currentItem = items[currentIndex];
                        return (
                          <div className="w-full h-full relative">
                            {currentItem.type === "video" ? (
                              <video
                                key={currentItem.id}
                                src={currentItem.url}
                                className="w-full h-full object-cover"
                                autoPlay
                                muted={currentItem.volume === 0 || currentItem.volume === undefined}
                                loop={items.length === 1}
                                ref={(video) => {
                                  if (video && currentItem.volume !== undefined && currentItem.volume > 0) {
                                    video.volume = currentItem.volume / 100;
                                    video.muted = false;
                                  }
                                }}
                              />
                            ) : (
                              <img
                                key={currentItem.id}
                                src={currentItem.url}
                                alt={currentItem.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                            {items.length > 1 && (
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                {items.map((_, idx) => (
                                  <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full transition-all ${
                                      idx === currentIndex ? "bg-white" : "bg-white/40"
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {el.type === "Pricing" && (
                    <div className="w-full h-full bg-slate-900 relative overflow-hidden">
                      {!el.content || !el.content.startsWith("http") ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white/60 text-sm">
                          <DollarSign size={24} className="mb-2" />
                          <span>Enter pricing page URL</span>
                        </div>
                      ) : (el.tickerMode) === "iframe" ? (
                        <iframe
                          src={el.content}
                          className="w-full h-full border-0"
                          title="Pricing Widget"
                          sandbox="allow-scripts allow-same-origin"
                        />
                      ) : (el.tickerMode === "screenshot" || el.tickerMode === "live" || !el.tickerMode) ? (
                        tickerScreenshots[el.content] === "loading" ? (
                          <div className="w-full h-full flex items-center justify-center text-white/60 text-sm bg-slate-800">
                            <DollarSign size={20} className="mr-2 animate-pulse" /> Loading pricing data...
                          </div>
                        ) : tickerScreenshots[el.content] === "error" || !tickerScreenshots[el.content] ? (
                          <div className="w-full h-full flex items-center justify-center text-white/60 text-sm bg-slate-800">
                            <DollarSign size={20} className="mr-2" /> Failed to load pricing
                          </div>
                        ) : (
                          <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                            <img 
                              src={tickerScreenshots[el.content]} 
                              alt="Pricing widget" 
                              className="w-full h-auto object-contain"
                              style={{ maxHeight: '100%' }}
                            />
                            {el.tickerMode === "live" && (
                              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                LIVE
                              </div>
                            )}
                          </div>
                        )
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Watermark in Preview */}
            {watermark.enabled && (
              <div
                className="absolute"
                style={{
                  opacity: watermark.opacity / 100,
                  ...(watermark.position === "top-left" && { top: 20, left: 20 }),
                  ...(watermark.position === "top-right" && { top: 20, right: 20 }),
                  ...(watermark.position === "bottom-left" && { bottom: 20, left: 20 }),
                  ...(watermark.position === "bottom-right" && { bottom: 20, right: 20 }),
                  ...(watermark.position === "center" && { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }),
                }}
              >
                {watermark.type === "text" ? (
                  <span style={{ fontSize: watermark.size, color: "white", textShadow: "0 0 4px rgba(0,0,0,0.5)" }}>
                    {watermark.text}
                  </span>
                ) : watermark.imageUrl ? (
                  <img src={watermark.imageUrl} alt="Watermark" style={{ height: watermark.size }} />
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Save Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name..."
                data-testid="input-template-name"
              />
            </div>
            {saveError && (
              <p className="text-sm text-red-500">{saveError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)} data-testid="cancel-save">
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={saving} data-testid="confirm-save">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>Load Template</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : savedTemplates.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No saved templates found</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {savedTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                    onClick={() => loadTemplate(template)}
                    data-testid={`template-item-${template.id}`}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{template.name}</p>
                      <p className="text-xs text-slate-500">
                        {template.orientation || "landscape"} • {template.elements?.length || 0} elements
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); loadTemplate(template); }}>
                      Load
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TemplateDesigner() {
  return (
    <TemplateDesignerErrorBoundary>
      <TemplateDesignerContent />
    </TemplateDesignerErrorBoundary>
  );
}
