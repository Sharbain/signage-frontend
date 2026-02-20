// client/src/lib/loadLeaflet.ts
// Loads Leaflet (and optional MarkerCluster + CSS) only when needed.
// This helps keep the main bundle smaller by pushing Leaflet into a lazy-loaded chunk.

export type LeafletNS = typeof import("leaflet");

export async function loadLeaflet(opts?: { css?: boolean; cluster?: boolean }): Promise<LeafletNS> {
  const { css = true, cluster = false } = opts ?? {};

  // Dynamic import ensures Leaflet can be code-split when used from lazy-loaded routes/components.
  const mod = await import("leaflet");
  const L = (mod as any).default ?? (mod as any);

  if (css) {
    // CSS can also be code-split by Vite.
    await import("leaflet/dist/leaflet.css");
  }

  if (cluster) {
    await import("leaflet.markercluster");
    await import("leaflet.markercluster/dist/MarkerCluster.Default.css");
  }

  return L as LeafletNS;
}
