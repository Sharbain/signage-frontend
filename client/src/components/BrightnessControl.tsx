import { useState } from "react";
import { api } from "@/lib/api";

interface Props {
  deviceId: string;
}

export function BrightnessControl({ deviceId }: Props) {
  const [value, setValue] = useState(50);
  const [loading, setLoading] = useState(false);

  async function handleChange(newValue: number) {
    setValue(newValue);
    setLoading(true);

    try {
      await api.devices.command(deviceId, {
        type: "BRIGHTNESS",
        value: newValue,
      });
    } finally {
      setLoading(false);
    }
  }

  const marks = Array.from({ length: 21 }, (_, i) => i * 5);

  return (
    <div className="space-y-2">
      <div className="text-sm text-[#3d3d3d] font-medium">
        Brightness ({value}%)
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="w-full"
      />

      <div className="flex justify-between text-[10px] text-[#6b6b6b]">
        {marks.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>

      {loading && (
        <div className="text-xs text-[#6b6b6b]">Applying…</div>
      )}
    </div>
  );
}
