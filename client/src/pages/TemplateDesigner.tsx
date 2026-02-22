// TemplateDesigner.tsx (FIXED)
// - Uses apiFetch() everywhere instead of fetch("/api/...") to ensure correct API base + auth.
// - Replaces sendBeacon autosave (cannot send auth headers) with keepalive fetch that includes Bearer token.
// - Fixes "missing_bearer_token" when saving templates.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  Save,
  Download,
  Upload,
  Eye,
  X,
  RefreshCw,
  Image as ImageIcon,
  Film,
  Type,
  Newspaper,
  Radio,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

import { apiFetch, API_BASE } from "@/lib/api";

type ElementType = "text" | "image" | "video" | "rss" | "ticker" | "clock" | "date";

type TemplateElement = {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;

  // shared
  z?: number;

  // text
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textAlign?: "left" | "center" | "right";

  // media
  url?: string;
  fit?: "cover" | "contain";

  // rss
  rssUrl?: string;
  rssMaxItems?: number;

  // ticker
  tickerText?: string;
  tickerSpeed?: number;
  tickerDirection?: "left" | "right";
  tickerBg?: string;
  tickerColor?: string;

  // clock/date
  format?: string;
};

type Template = {
  id: number;
  name: string;
  width: number;
  height: number;
  background?: string | null;
  elements: TemplateElement[];
  created_at?: string;
  updated_at?: string;
};

type MediaItem = {
  id: number;
  name: string;
  type: "image" | "video";
  url: string;
  size?: number;
  uploadedAt?: string;
};

export default function TemplateDesigner() {
  const navigate = useNavigate();

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    mode: "move" | "resize";
    corner?: "br";
  } | null>(null);

  // canvas size
  const [canvasW, setCanvasW] = useState(1920);
  const [canvasH, setCanvasH] = useState(1080);

  // templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [currentTemplateId, setCurrentTemplateId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [elements, setElements] = useState<TemplateElement[]>([]);
  const [background, setBackground] = useState<string>("#ffffff");

  // selection
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => elements.find((e) => e.id === selectedId) || null,
    [elements, selectedId]
  );

  // UI
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // media library
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // preview
  const [showPreview, setShowPreview] = useState(false);

  // helpers
  const uuid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  function bringToFront(id: string) {
    setElements((prev) => {
      const maxZ = prev.reduce((m, el) => Math.max(m, el.z ?? 0), 0);
      return prev.map((el) => (el.id === id ? { ...el, z: maxZ + 1 } : el));
    });
  }

  function addElement(type: ElementType) {
    const id = uuid();
    const base: TemplateElement = {
      id,
      type,
      x: 100,
      y: 100,
      w: 600,
      h: 160,
      z: elements.reduce((m, el) => Math.max(m, el.z ?? 0), 0) + 1,
    };

    let el: TemplateElement = base;

    if (type === "text") {
      el = {
        ...base,
        w: 600,
        h: 200,
        text: "New text",
        fontFamily: "Inter",
        fontSize: 24,
        color: "#111827",
        bold: false,
        italic: false,
        underline: false,
        textAlign: "left",
      };
    } else if (type === "image") {
      el = { ...base, w: 640, h: 360, url: "", fit: "cover" };
    } else if (type === "video") {
      el = { ...base, w: 640, h: 360, url: "", fit: "cover" };
    } else if (type === "rss") {
      el = {
        ...base,
        w: 700,
        h: 260,
        rssUrl: "",
        rssMaxItems: 5,
      };
    } else if (type === "ticker") {
      el = {
        ...base,
        w: 900,
        h: 80,
        tickerText: "Breaking news ticker…",
        tickerSpeed: 60,
        tickerDirection: "left",
        tickerBg: "#111827",
        tickerColor: "#ffffff",
      };
    } else if (type === "clock") {
      el = {
        ...base,
        w: 320,
        h: 120,
        format: "HH:mm",
      };
    } else if (type === "date") {
      el = {
        ...base,
        w: 420,
        h: 120,
        format: "YYYY-MM-DD",
      };
    }

    setElements((prev) => [...prev, el]);
    setSelectedId(id);
  }

  function removeSelected() {
    if (!selectedId) return;
    setElements((prev) => prev.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  }

  function updateSelected(patch: Partial<TemplateElement>) {
    if (!selectedId) return;
    setElements((prev) => prev.map((e) => (e.id === selectedId ? { ...e, ...patch } : e)));
  }

  function onCanvasMouseDown(e: React.MouseEvent) {
    // click on empty canvas clears selection
    if (e.target === canvasRef.current) setSelectedId(null);
  }

  function onElementMouseDown(e: React.MouseEvent, id: string) {
    e.stopPropagation();

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const el = elements.find((x) => x.id === id);
    if (!el) return;

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    bringToFront(id);
    setSelectedId(id);

    dragRef.current = {
      id,
      startX: offsetX,
      startY: offsetY,
      origX: el.x,
      origY: el.y,
      mode: "move",
    };
  }

  function onResizeMouseDown(e: React.MouseEvent, id: string) {
    e.stopPropagation();

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const el = elements.find((x) => x.id === id);
    if (!el) return;

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setSelectedId(id);

    dragRef.current = {
      id,
      startX: offsetX,
      startY: offsetY,
      origX: el.w,
      origY: el.h,
      mode: "resize",
      corner: "br",
    };
  }

  function onMouseMove(e: MouseEvent) {
    const rect = canvasRef.current?.getBoundingClientRect();
    const drag = dragRef.current;
    if (!rect || !drag) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== drag.id) return el;

        if (drag.mode === "move") {
          const nx = clamp(drag.origX + (x - drag.startX), 0, canvasW - el.w);
          const ny = clamp(drag.origY + (y - drag.startY), 0, canvasH - el.h);
          return { ...el, x: nx, y: ny };
        }

        // resize bottom-right
        const nw = clamp(drag.origX + (x - drag.startX), 20, canvasW - el.x);
        const nh = clamp(drag.origY + (y - drag.startY), 20, canvasH - el.y);
        return { ...el, w: nw, h: nh };
      })
    );
  }

  function onMouseUp() {
    dragRef.current = null;
  }

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasW, canvasH, elements]);

  // -------------------------
  // API: Templates / Media
  // -------------------------
  async function fetchTemplates() {
    setLoadingTemplates(true);
    try {
      const res = await apiFetch("/templates", { method: "GET" });
      const data = await res.json().catch(() => []);
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load templates:", err);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }

  async function fetchMedia() {
    setLoadingMedia(true);
    try {
      const res = await apiFetch("/media", { method: "GET" });
      const data = await res.json().catch(() => []);
      setMedia(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load media:", err);
      setMedia([]);
    } finally {
      setLoadingMedia(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await apiFetch("/media/upload", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Upload failed");
      }

      await fetchMedia();
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(err?.message || "Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function saveTemplateToServer(nameOverride?: string) {
    setSaveError(null);

    const name = (nameOverride ?? templateName).trim();
    if (!name) {
      setSaveError("Template name is required.");
      return;
    }

    const payload = {
      name,
      width: canvasW,
      height: canvasH,
      background,
      elements,
    };

    try {
      let res: Response;

      if (currentTemplateId) {
        res = await apiFetch(`/templates/${currentTemplateId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch(`/templates`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        // backend often returns { error: "missing_bearer_token" }
        throw new Error(json?.error || json?.message || "Failed to save template");
      }

      // if created, capture id
      if (!currentTemplateId && json?.id) setCurrentTemplateId(json.id);
      setTemplateName(name);
      await fetchTemplates();
      setShowSaveDialog(false);
    } catch (err: any) {
      console.error("Save template error:", err);
      setSaveError(err?.message || "Failed to save template");
    }
  }

  async function loadTemplateFromServer(t: Template) {
    setCurrentTemplateId(t.id);
    setTemplateName(t.name);
    setCanvasW(t.width);
    setCanvasH(t.height);
    setBackground(t.background ?? "#ffffff");
    setElements(Array.isArray(t.elements) ? t.elements : []);
    setSelectedId(null);
    setShowLoadDialog(false);
  }

  async function deleteTemplate(id: number) {
    const ok = window.confirm("Delete this template?");
    if (!ok) return;

    try {
      const res = await apiFetch(`/templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Failed to delete template");
      }

      if (currentTemplateId === id) {
        setCurrentTemplateId(null);
        setTemplateName("");
        setElements([]);
        setBackground("#ffffff");
      }

      await fetchTemplates();
    } catch (err: any) {
      console.error("Delete template error:", err);
      alert(err?.message || "Failed to delete template");
    }
  }

  function exportTemplate() {
    const data = {
      name: templateName || "template",
      width: canvasW,
      height: canvasH,
      background,
      elements,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.name}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }

  function importTemplate(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result || "{}"));
        setTemplateName(json?.name || "");
        setCanvasW(Number(json?.width || 1920));
        setCanvasH(Number(json?.height || 1080));
        setBackground(json?.background || "#ffffff");
        setElements(Array.isArray(json?.elements) ? json.elements : []);
        setCurrentTemplateId(null);
        setSelectedId(null);
      } catch (e) {
        alert("Invalid template file");
      }
    };
    reader.readAsText(file);
  }

  // Load initial data
  useEffect(() => {
    fetchTemplates();
    fetchMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave on page close / refresh (keepalive fetch with auth headers)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!currentTemplateId) return;
      if (!templateName.trim()) return;

      const templateData = {
        name: templateName.trim(),
        width: canvasW,
        height: canvasH,
        background,
        elements,
      };

      // sendBeacon can't send auth headers, so use keepalive fetch instead
      const token = localStorage.getItem("accessToken");
      fetch(`${API_BASE}/templates/${currentTemplateId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(templateData),
        keepalive: true,
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [API_BASE, background, canvasH, canvasW, currentTemplateId, elements, templateName]);

  // Sorted by z
  const sortedElements = useMemo(() => {
    return [...elements].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  }, [elements]);

  // -------------------------
  // Render helpers
  // -------------------------
  function renderElement(el: TemplateElement) {
    if (el.type === "text") {
      const style: any = {
        fontFamily: el.fontFamily || "Inter",
        fontSize: el.fontSize || 24,
        color: el.color || "#111827",
        fontWeight: el.bold ? 700 : 400,
        fontStyle: el.italic ? "italic" : "normal",
        textDecoration: el.underline ? "underline" : "none",
        textAlign: el.textAlign || "left",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent:
          (el.textAlign || "left") === "left"
            ? "flex-start"
            : (el.textAlign || "left") === "center"
            ? "center"
            : "flex-end",
        padding: 8,
        boxSizing: "border-box",
        whiteSpace: "pre-wrap",
        overflow: "hidden",
      };
      return <div style={style}>{el.text || ""}</div>;
    }

    if (el.type === "image") {
      if (!el.url) {
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
            No image selected
          </div>
        );
      }
      return (
        <img
          src={el.url}
          alt=""
          className="w-full h-full"
          style={{ objectFit: el.fit || "cover" }}
          draggable={false}
        />
      );
    }

    if (el.type === "video") {
      if (!el.url) {
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
            No video selected
          </div>
        );
      }
      return (
        <video
          src={el.url}
          className="w-full h-full"
          style={{ objectFit: el.fit || "cover" }}
          controls
        />
      );
    }

    if (el.type === "rss") {
      return (
        <div className="w-full h-full bg-white/80 p-2 text-xs overflow-hidden">
          <div className="font-semibold mb-1 flex items-center gap-1">
            <Newspaper className="w-4 h-4" /> RSS Feed
          </div>
          <div className="text-gray-600 break-all">{el.rssUrl || "Set RSS URL…"}</div>
          <div className="mt-2 text-gray-500">
            Max items: {el.rssMaxItems ?? 5}
          </div>
        </div>
      );
    }

    if (el.type === "ticker") {
      return (
        <div
          className="w-full h-full flex items-center px-3"
          style={{
            background: el.tickerBg || "#111827",
            color: el.tickerColor || "#ffffff",
            fontSize: 20,
            overflow: "hidden",
          }}
        >
          <Radio className="w-5 h-5 mr-2 opacity-80" />
          <div className="truncate">{el.tickerText || "Ticker…"}</div>
        </div>
      );
    }

    if (el.type === "clock") {
      return (
        <div className="w-full h-full flex items-center justify-center bg-white/70 text-gray-900">
          <Clock className="w-5 h-5 mr-2" />
          <span className="text-xl font-semibold">HH:mm</span>
        </div>
      );
    }

    if (el.type === "date") {
      return (
        <div className="w-full h-full flex items-center justify-center bg-white/70 text-gray-900">
          <Calendar className="w-5 h-5 mr-2" />
          <span className="text-xl font-semibold">YYYY-MM-DD</span>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="p-6">
      {/* header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <button
            className="px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 flex items-center gap-2"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-semibold">Template Designer</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 flex items-center gap-2"
            onClick={() => setShowLoadDialog(true)}
          >
            <Upload className="w-4 h-4" /> Load
          </button>

          <button
            className="px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 flex items-center gap-2"
            onClick={() => setShowSaveDialog(true)}
          >
            <Save className="w-4 h-4" /> Save As
          </button>

          <button
            className="px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 flex items-center gap-2"
            onClick={exportTemplate}
          >
            <Download className="w-4 h-4" /> Export
          </button>

          <button
            className="px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 flex items-center gap-2"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="w-4 h-4" /> Preview
          </button>
        </div>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          className="px-3 py-2 rounded bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-2"
          onClick={() => addElement("text")}
        >
          <Type className="w-4 h-4" /> Text
        </button>

        <button
          className="px-3 py-2 rounded bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-2"
          onClick={() => addElement("image")}
        >
          <ImageIcon className="w-4 h-4" /> Image
        </button>

        <button
          className="px-3 py-2 rounded bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-2"
          onClick={() => addElement("video")}
        >
          <Film className="w-4 h-4" /> Video
        </button>

        <button
          className="px-3 py-2 rounded bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-2"
          onClick={() => addElement("rss")}
        >
          <Newspaper className="w-4 h-4" /> RSS
        </button>

        <button
          className="px-3 py-2 rounded bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-2"
          onClick={() => addElement("ticker")}
        >
          <Radio className="w-4 h-4" /> Ticker
        </button>

        <button
          className="px-3 py-2 rounded bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-2"
          onClick={() => addElement("clock")}
        >
          <Clock className="w-4 h-4" /> Clock
        </button>

        <button
          className="px-3 py-2 rounded bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-2"
          onClick={() => addElement("date")}
        >
          <Calendar className="w-4 h-4" /> Date
        </button>

        <button
          className="ml-auto px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
          onClick={removeSelected}
          disabled={!selectedId}
        >
          <Trash2 className="w-4 h-4" /> Delete Selected
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* canvas */}
        <div className="col-span-12 lg:col-span-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-600">Canvas:</span>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={`${canvasW}x${canvasH}`}
              onChange={(e) => {
                const [w, h] = e.target.value.split("x").map(Number);
                setCanvasW(w);
                setCanvasH(h);
              }}
            >
              <option value="1920x1080">1920×1080 (Landscape)</option>
              <option value="1080x1920">1080×1920 (Portrait)</option>
              <option value="1280x720">1280×720</option>
              <option value="3840x2160">3840×2160 (4K)</option>
            </select>

            <span className="text-sm text-gray-600 ml-3">Background:</span>
            <input
              type="color"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="w-8 h-8 p-0 border rounded"
              title="Background color"
            />
          </div>

          <div
            ref={canvasRef}
            onMouseDown={onCanvasMouseDown}
            className="relative border rounded-lg overflow-hidden shadow"
            style={{
              width: "100%",
              aspectRatio: `${canvasW}/${canvasH}`,
              background,
            }}
          >
            {/* elements */}
            {sortedElements.map((el) => (
              <div
                key={el.id}
                onMouseDown={(e) => onElementMouseDown(e, el.id)}
                className={`absolute border ${
                  selectedId === el.id ? "border-blue-500" : "border-transparent"
                }`}
                style={{
                  left: `${(el.x / canvasW) * 100}%`,
                  top: `${(el.y / canvasH) * 100}%`,
                  width: `${(el.w / canvasW) * 100}%`,
                  height: `${(el.h / canvasH) * 100}%`,
                  zIndex: el.z ?? 0,
                  userSelect: "none",
                }}
              >
                {renderElement(el)}

                {/* resize handle */}
                {selectedId === el.id && (
                  <div
                    onMouseDown={(e) => onResizeMouseDown(e, el.id)}
                    className="absolute -right-1 -bottom-1 w-3 h-3 bg-blue-500 rounded-sm cursor-se-resize"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* right panel */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* selected settings */}
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Element Settings</h2>
              {selected && (
                <span className="text-xs text-gray-500 uppercase">{selected.type}</span>
              )}
            </div>

            {!selected ? (
              <div className="text-sm text-gray-500">Select an element to edit its settings.</div>
            ) : (
              <div className="space-y-3">
                {/* position / size */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-gray-600">
                    X
                    <input
                      type="number"
                      className="mt-1 w-full border rounded px-2 py-1 text-sm"
                      value={selected.x}
                      onChange={(e) => updateSelected({ x: Number(e.target.value) })}
                    />
                  </label>
                  <label className="text-xs text-gray-600">
                    Y
                    <input
                      type="number"
                      className="mt-1 w-full border rounded px-2 py-1 text-sm"
                      value={selected.y}
                      onChange={(e) => updateSelected({ y: Number(e.target.value) })}
                    />
                  </label>
                  <label className="text-xs text-gray-600">
                    Width
                    <input
                      type="number"
                      className="mt-1 w-full border rounded px-2 py-1 text-sm"
                      value={selected.w}
                      onChange={(e) => updateSelected({ w: Number(e.target.value) })}
                    />
                  </label>
                  <label className="text-xs text-gray-600">
                    Height
                    <input
                      type="number"
                      className="mt-1 w-full border rounded px-2 py-1 text-sm"
                      value={selected.h}
                      onChange={(e) => updateSelected({ h: Number(e.target.value) })}
                    />
                  </label>
                </div>

                {/* type-specific */}
                {selected.type === "text" && (
                  <>
                    <label className="text-xs text-gray-600 block">
                      Text
                      <textarea
                        className="mt-1 w-full border rounded px-2 py-1 text-sm"
                        rows={3}
                        value={selected.text || ""}
                        onChange={(e) => updateSelected({ text: e.target.value })}
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs text-gray-600">
                        Font
                        <input
                          className="mt-1 w-full border rounded px-2 py-1 text-sm"
                          value={selected.fontFamily || "Inter"}
                          onChange={(e) => updateSelected({ fontFamily: e.target.value })}
                        />
                      </label>
                      <label className="text-xs text-gray-600">
                        Size
                        <input
                          type="number"
                          className="mt-1 w-full border rounded px-2 py-1 text-sm"
                          value={selected.fontSize || 24}
                          onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                        />
                      </label>

                      <label className="text-xs text-gray-600">
                        Color
                        <input
                          type="color"
                          className="mt-1 w-full border rounded px-2 py-1 text-sm h-9"
                          value={selected.color || "#111827"}
                          onChange={(e) => updateSelected({ color: e.target.value })}
                        />
                      </label>

                      <label className="text-xs text-gray-600">
                        Align
                        <select
                          className="mt-1 w-full border rounded px-2 py-1 text-sm"
                          value={selected.textAlign || "left"}
                          onChange={(e) =>
                            updateSelected({ textAlign: e.target.value as any })
                          }
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        className={`px-3 py-1 rounded border text-sm ${
                          selected.bold ? "bg-gray-900 text-white" : "bg-white"
                        }`}
                        onClick={() => updateSelected({ bold: !selected.bold })}
                      >
                        B
                      </button>
                      <button
                        className={`px-3 py-1 rounded border text-sm ${
                          selected.italic ? "bg-gray-900 text-white" : "bg-white"
                        }`}
                        onClick={() => updateSelected({ italic: !selected.italic })}
                      >
                        I
                      </button>
                      <button
                        className={`px-3 py-1 rounded border text-sm ${
                          selected.underline ? "bg-gray-900 text-white" : "bg-white"
                        }`}
                        onClick={() => updateSelected({ underline: !selected.underline })}
                      >
                        U
                      </button>
                    </div>
                  </>
                )}

                {(selected.type === "image" || selected.type === "video") && (
                  <>
                    <label className="text-xs text-gray-600 block">
                      URL
                      <input
                        className="mt-1 w-full border rounded px-2 py-1 text-sm"
                        value={selected.url || ""}
                        onChange={(e) => updateSelected({ url: e.target.value })}
                        placeholder="Paste media URL or select from library below…"
                      />
                    </label>

                    <label className="text-xs text-gray-600 block">
                      Fit
                      <select
                        className="mt-1 w-full border rounded px-2 py-1 text-sm"
                        value={selected.fit || "cover"}
                        onChange={(e) => updateSelected({ fit: e.target.value as any })}
                      >
                        <option value="cover">Cover</option>
                        <option value="contain">Contain</option>
                      </select>
                    </label>
                  </>
                )}

                {selected.type === "rss" && (
                  <>
                    <label className="text-xs text-gray-600 block">
                      RSS URL
                      <input
                        className="mt-1 w-full border rounded px-2 py-1 text-sm"
                        value={selected.rssUrl || ""}
                        onChange={(e) => updateSelected({ rssUrl: e.target.value })}
                        placeholder="https://example.com/rss.xml"
                      />
                    </label>

                    <label className="text-xs text-gray-600 block">
                      Max items
                      <input
                        type="number"
                        className="mt-1 w-full border rounded px-2 py-1 text-sm"
                        value={selected.rssMaxItems ?? 5}
                        onChange={(e) => updateSelected({ rssMaxItems: Number(e.target.value) })}
                        min={1}
                        max={20}
                      />
                    </label>
                  </>
                )}

                {selected.type === "ticker" && (
                  <>
                    <label className="text-xs text-gray-600 block">
                      Ticker text
                      <input
                        className="mt-1 w-full border rounded px-2 py-1 text-sm"
                        value={selected.tickerText || ""}
                        onChange={(e) => updateSelected({ tickerText: e.target.value })}
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs text-gray-600">
                        Speed
                        <input
                          type="number"
                          className="mt-1 w-full border rounded px-2 py-1 text-sm"
                          value={selected.tickerSpeed ?? 60}
                          onChange={(e) =>
                            updateSelected({ tickerSpeed: Number(e.target.value) })
                          }
                          min={10}
                          max={300}
                        />
                      </label>
                      <label className="text-xs text-gray-600">
                        Direction
                        <select
                          className="mt-1 w-full border rounded px-2 py-1 text-sm"
                          value={selected.tickerDirection || "left"}
                          onChange={(e) =>
                            updateSelected({ tickerDirection: e.target.value as any })
                          }
                        >
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                        </select>
                      </label>

                      <label className="text-xs text-gray-600">
                        Bg
                        <input
                          type="color"
                          className="mt-1 w-full border rounded px-2 py-1 text-sm h-9"
                          value={selected.tickerBg || "#111827"}
                          onChange={(e) => updateSelected({ tickerBg: e.target.value })}
                        />
                      </label>
                      <label className="text-xs text-gray-600">
                        Color
                        <input
                          type="color"
                          className="mt-1 w-full border rounded px-2 py-1 text-sm h-9"
                          value={selected.tickerColor || "#ffffff"}
                          onChange={(e) => updateSelected({ tickerColor: e.target.value })}
                        />
                      </label>
                    </div>
                  </>
                )}

                {(selected.type === "clock" || selected.type === "date") && (
                  <label className="text-xs text-gray-600 block">
                    Format
                    <input
                      className="mt-1 w-full border rounded px-2 py-1 text-sm"
                      value={selected.format || ""}
                      onChange={(e) => updateSelected({ format: e.target.value })}
                      placeholder={selected.type === "clock" ? "HH:mm" : "YYYY-MM-DD"}
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* media library */}
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Media Library</h2>
              <button
                className="px-3 py-1 rounded border text-sm hover:bg-gray-50 flex items-center gap-2"
                onClick={fetchMedia}
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleUpload}
              />
              <button
                className="px-3 py-2 rounded bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-2 text-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Upload
                  </>
                )}
              </button>
            </div>

            {loadingMedia ? (
              <div className="text-sm text-gray-500">Loading media…</div>
            ) : media.length === 0 ? (
              <div className="text-sm text-gray-500">No media found.</div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-auto pr-1">
                {media.map((m) => (
                  <button
                    key={m.id}
                    className="border rounded p-2 text-left hover:bg-gray-50"
                    onClick={() => {
                      if (!selected) return;
                      if (selected.type === "image" && m.type === "image") updateSelected({ url: m.url });
                      if (selected.type === "video" && m.type === "video") updateSelected({ url: m.url });
                    }}
                    title="Click to assign to selected element"
                  >
                    <div className="text-xs font-medium truncate">{m.name}</div>
                    <div className="text-[10px] text-gray-500 uppercase">{m.type}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[520px] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Save Template</h3>
              <button
                className="p-1 rounded hover:bg-gray-100"
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveError(null);
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="text-sm text-gray-600 block mb-1">Template Name</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Lobby Screen"
            />

            {saveError && <div className="text-sm text-red-600 mt-2">{saveError}</div>}

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 rounded border hover:bg-gray-50"
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveError(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-gray-900 text-white hover:bg-gray-800"
                onClick={() => saveTemplateToServer()}
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load dialog */}
      {showLoadDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[720px] p-5 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Load Template</h3>
              <button
                className="p-1 rounded hover:bg-gray-100"
                onClick={() => setShowLoadDialog(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <button
                className="px-3 py-2 rounded border hover:bg-gray-50 flex items-center gap-2 text-sm"
                onClick={fetchTemplates}
                disabled={loadingTemplates}
              >
                {loadingTemplates ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </>
                )}
              </button>

              <label className="px-3 py-2 rounded border hover:bg-gray-50 flex items-center gap-2 text-sm cursor-pointer">
                <Upload className="w-4 h-4" />
                Import JSON
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importTemplate(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

            {templates.length === 0 ? (
              <div className="text-sm text-gray-500">No templates found.</div>
            ) : (
              <div className="divide-y">
                {templates.map((t) => (
                  <div key={t.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-gray-500">
                        {t.width}×{t.height}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-2 rounded bg-gray-900 text-white hover:bg-gray-800 text-sm"
                        onClick={() => loadTemplateFromServer(t)}
                      >
                        Load
                      </button>
                      <button
                        className="px-3 py-2 rounded border hover:bg-gray-50 text-sm"
                        onClick={() => deleteTemplate(t.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-black rounded-lg shadow-xl w-[92vw] h-[86vh] overflow-hidden relative">
            <button
              className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white rounded p-2"
              onClick={() => setShowPreview(false)}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-full h-full flex items-center justify-center">
              <div
                className="relative"
                style={{
                  width: "90%",
                  height: "90%",
                  background,
                  aspectRatio: `${canvasW}/${canvasH}`,
                }}
              >
                {sortedElements.map((el) => (
                  <div
                    key={el.id}
                    className="absolute"
                    style={{
                      left: `${(el.x / canvasW) * 100}%`,
                      top: `${(el.y / canvasH) * 100}%`,
                      width: `${(el.w / canvasW) * 100}%`,
                      height: `${(el.h / canvasH) * 100}%`,
                      zIndex: el.z ?? 0,
                      pointerEvents: "none",
                    }}
                  >
                    {renderElement(el)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
