import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, authorizedFetch } from "../lib/api";
import { QRCodeCanvas } from "qrcode.react";

type CreatedDevice = {
  id: string;
  device_id?: string;
  name: string;
  location_branch?: string | null;
  pairing_code?: string | null;
  pairing_expires_at?: string | null;
};

export default function AddDevice() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [created, setCreated] = useState<CreatedDevice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Device name is required");
      return;
    }

    try {
      setLoading(true);

      const res = await authorizedFetch(`${API_BASE}/devices`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          location_branch: location.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create device");
      }

      const data = await res.json();
      setCreated(data.device);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to create device");
    } finally {
      setLoading(false);
    }
  }

  const pairingExpiresLabel =
    created?.pairing_expires_at
      ? new Date(created.pairing_expires_at).toLocaleString()
      : null;

  return (
    <div className="p-6">
      <button
        onClick={() => navigate("/devices")}
        className="text-[#5b7a5b] hover:underline mb-4"
        data-testid="button-back-devices"
      >
        ← Back to Devices
      </button>

      <h1 className="text-xl font-semibold mb-4 text-[#3d3d3d]">
        Add New Device
      </h1>

      {!created && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow border border-[#e0ddd5] p-4 max-w-md space-y-3"
        >
          {error && (
            <div className="text-sm text-[#c9534a] border border-[#c9534a]/30 bg-[#c9534a]/5 p-2 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-[#3d3d3d]">
              Device Name *
            </label>
            <input
              className="w-full border border-[#e0ddd5] rounded p-2 bg-white text-[#3d3d3d] focus:outline-none focus:border-[#5b7a5b]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Display #1 – Branch 4"
              data-testid="input-device-name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-[#3d3d3d]">
              Location / Branch
            </label>
            <input
              className="w-full border border-[#e0ddd5] rounded p-2 bg-white text-[#3d3d3d] focus:outline-none focus:border-[#5b7a5b]"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Branch 4 – Waiting Area"
              data-testid="input-device-location"
            />
          </div>

          <button
            type="submit"
            className="bg-[#5b7a5b] text-white px-4 py-2 rounded shadow hover:bg-[#4a6349] transition disabled:opacity-60"
            disabled={loading}
            data-testid="button-create-device"
          >
            {loading ? "Creating..." : "Create Device"}
          </button>
        </form>
      )}

      {created && (
        <div className="bg-white rounded-xl shadow border border-[#e0ddd5] p-4 max-w-xl mt-4">
          <h2 className="font-semibold mb-2 text-[#3d3d3d]">Device Created</h2>

          <p className="text-sm mb-2 text-[#3d3d3d]">
            Device <strong>{created.name}</strong> has been created with ID:
          </p>
          <p className="font-mono text-sm mb-4 bg-[#fafaf8] px-2 py-1 rounded inline-block text-[#3d3d3d]">
            {created.device_id || created.id}
          </p>

          <div className="flex gap-6 items-start">
            <div className="flex flex-col items-start gap-2 flex-1">
              <div className="w-full border border-[#e0ddd5] rounded-xl p-4 bg-[#fafaf8]">
                <div className="text-xs text-[#6b6b6b] mb-1">
                  Pairing Code (type this on the device)
                </div>

                <div className="font-mono text-3xl tracking-widest text-[#3d3d3d]">
                  {created.pairing_code || "—"}
                </div>

                {/* Pairing QR (scan on device) */}
                {created.pairing_code && (
                  <div className="mt-4">
                    <div className="text-xs text-[#6b6b6b] mb-2">Pairing QR (scan on the device)</div>
                    <div className="bg-white border border-[#e0ddd5] rounded-xl p-3 inline-block">
                      <QRCodeCanvas
                        value={JSON.stringify({
                          pairingCode: created.pairing_code,
                          apiBase: API_BASE.replace(/\/?api\/?$/, ""),
                        })}
                        size={160}
                        includeMargin
                      />
                    </div>
                    <div className="text-[11px] text-[#6b6b6b] mt-2">
                      You can scan this QR in the Lumina Player setup (or type the code).
                    </div>
                  </div>
                )}


                {pairingExpiresLabel && (
                  <div className="text-xs text-[#6b6b6b] mt-2">
                    Expires: {pairingExpiresLabel}
                  </div>
                )}

                <button
                  type="button"
                  className="mt-3 text-sm bg-white border border-[#e0ddd5] px-3 py-2 rounded hover:bg-[#f5f5f0] transition"
                  onClick={async () => {
                    if (created.pairing_code) {
                      await navigator.clipboard.writeText(created.pairing_code);
                    }
                  }}
                >
                  Copy Pairing Code
                </button>
              </div>

              <div className="text-xs text-[#6b6b6b]">
                No camera needed. Use the pairing code on the Lumina Player setup
                screen.
              </div>
            </div>

            <div className="text-sm text-[#3d3d3d] space-y-2 max-w-xs">
              <p className="font-medium">Next steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-[#6b6b6b]">
                <li>Install the Lumina Player APK on the display device.</li>
                <li>On first launch, open the setup screen.</li>
                <li>Type the pairing code shown here.</li>
                <li>The device will activate and start appearing as online.</li>
              </ol>

              <button
                className="mt-3 text-sm bg-[#5b7a5b] text-white px-3 py-2 rounded hover:bg-[#4a6349] transition"
                onClick={() => navigate("/devices")}
                data-testid="button-go-to-devices"
              >
                Go to Devices List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
