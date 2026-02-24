import { useEffect, useState } from "react";
import { apiJson, apiFetch } from "@/lib/api";

export default function Settings() {
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const r = await apiJson<{ url: string | null }>(
        "/settings/fallback-logo",
        { method: "GET" },
        "Failed to load fallback logo",
      );
      setFallbackUrl(r?.url ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load settings");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onUpload = async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      const fd = new FormData();
      fd.append("file", file);

      const res = await apiFetch("/admin/settings/fallback-logo", {
        method: "POST",
        body: fd,
      });

      const text = await res.text().catch(() => "");
      if (!res.ok) throw new Error(text || `Upload failed (HTTP ${res.status})`);

      const json = JSON.parse(text);
      setFallbackUrl(json?.url ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#3d3d3d]">Settings</h1>
        <div className="text-sm text-[#6b6b6b]">
          Configure defaults for new devices.
        </div>
      </div>

      <div className="bg-white border border-[#e0ddd5] rounded-2xl p-4 shadow-sm">
        <div className="font-semibold text-[#3d3d3d] mb-1">Default (Fallback) Logo</div>
        <div className="text-sm text-[#6b6b6b] mb-3">
          When a device connects with no playlist assigned, it will show this image until you push
          content.
        </div>

        {error && <div className="text-sm text-[#c9534a] mb-3">{error}</div>}

        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="w-full md:w-[360px]">
            <div className="text-xs text-[#6b6b6b] mb-2">Preview</div>
            <div className="border rounded-xl overflow-hidden bg-[#f5f5f0] flex items-center justify-center h-[200px]">
              {fallbackUrl ? (
                <img
                  src={fallbackUrl}
                  alt="Fallback logo"
                  className="max-h-[200px] max-w-full object-contain"
                />
              ) : (
                <div className="text-sm text-[#6b6b6b]">No logo uploaded yet.</div>
              )}
            </div>
          </div>

          <div className="flex-1">
            <div className="text-xs text-[#6b6b6b] mb-2">Upload a new image</div>
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
              }}
            />
            <div className="mt-2 text-xs text-[#6b6b6b]">
              Tip: use a transparent PNG for best results.
            </div>
            <button
              className="mt-4 px-3 py-2 rounded bg-white border hover:bg-[#f5f5f0]"
              onClick={load}
              disabled={uploading}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
