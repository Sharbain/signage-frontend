import { useState } from "react";
import { useNavigate } from "react-router-dom";

type CreatedDevice = {
  id: string;
  name: string;
  location_branch?: string | null;
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
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      setError(e.message || "Failed to create device");
    } finally {
      setLoading(false);
    }
  }

  const qrData = created ? created.id : "";

  return (
    <div className="p-6">
      <button
        onClick={() => navigate("/devices")}
        className="text-[#5b7a5b] hover:underline mb-4"
        data-testid="button-back-devices"
      >
        ← Back to Devices
      </button>

      <h1 className="text-xl font-semibold mb-4 text-[#3d3d3d]">Add New Device</h1>

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
            {created.id}
          </p>

          <div className="flex gap-6 items-start">
            <div className="flex flex-col items-center">
              <div className="border border-[#e0ddd5] rounded-xl p-2 bg-white">
                <img
                  src={
                    "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" +
                    encodeURIComponent(qrData)
                  }
                  alt="Device QR"
                />
              </div>
              <div className="text-xs text-[#6b6b6b] mt-2 text-center">
                Scan this QR in the Android app or enter the Device ID manually.
              </div>
            </div>

            <div className="text-sm text-[#3d3d3d] space-y-2 max-w-xs">
              <p className="font-medium">Next steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-[#6b6b6b]">
                <li>Install the Lumina Player APK on the display device.</li>
                <li>On first launch, open the setup screen.</li>
                <li>Scan the QR code above OR type the Device ID manually.</li>
                <li>The device will register and start appearing as online.</li>
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
