import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

interface Props {
  deviceId: string;
}

function MarksRow() {
  const marks = useMemo(() => Array.from({ length: 21 }, (_, i) => i * 5), []);
  return (
    <div className="mt-2 flex justify-between text-[10px] text-[#6b6b6b] select-none">
      {marks.map((m) => (
        <span key={m} className="w-[1px] text-center">
          {m}
        </span>
      ))}
    </div>
  );
}

export function BrightnessControl({ deviceId }: Props) {
  const [value, setValue] = useState(50);        // UI value
  const [applied, setApplied] = useState(50);    // last sent value
  const [sending, setSending] = useState(false);
  const [lastAppliedAt, setLastAppliedAt] = useState<Date | null>(null);

  const pending = value !== applied;
  const lastSendRef = useRef<number>(0);

  // % for track fill
  const pct = Math.round((value / 100) * 100);

  async function sendNow(v: number) {
    // small guard against accidental double-fire on touch+mouse
    const now = Date.now();
    if (now - lastSendRef.current < 250) return;
    lastSendRef.current = now;

    setSending(true);
    try {
      await api.devices.command(deviceId, { type: "BRIGHTNESS", value: v });
      setApplied(v);
      setLastAppliedAt(new Date());
    } finally {
      setSending(false);
    }
  }

  // Send when user releases the slider
  const commit = () => {
    if (value !== applied) void sendNow(value);
  };

  // If someone changes deviceId, reset applied state safely (optional)
  useEffect(() => {
    setApplied(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-[#3d3d3d]">
          Brightness <span className="text-[#6b6b6b]">({value}%)</span>
        </div>

        <div className="text-xs text-[#6b6b6b]">
          {sending ? (
            <span>Applying…</span>
          ) : pending ? (
            <span className="text-[#b5836d]">Pending</span>
          ) : lastAppliedAt ? (
            <span>Applied ✓</span>
          ) : (
            <span>—</span>
          )}
        </div>
      </div>

      {/* Slider */}
      <div className="rounded-xl border border-[#e0ddd5] bg-white p-3">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          onMouseUp={commit}
          onTouchEnd={commit}
          onKeyUp={(e) => {
            // commit on keyboard changes too (arrows)
            if (
              e.key === "ArrowLeft" ||
              e.key === "ArrowRight" ||
              e.key === "ArrowUp" ||
              e.key === "ArrowDown"
            ) {
              commit();
            }
          }}
          className="lumina-range w-full"
          style={{ ["--pct" as any]: `${pct}%` }}
          aria-label="Brightness"
        />

        <MarksRow />

        {lastAppliedAt && (
          <div className="mt-2 text-[10px] text-[#6b6b6b]">
            {lastAppliedAt.toLocaleString()}
          </div>
        )}
      </div>

      {/* SaaS-grade slider styling */}
      <style>{`
        .lumina-range {
          -webkit-appearance: none;
          appearance: none;
          height: 10px;
          border-radius: 999px;
          outline: none;
          background:
            linear-gradient(to right, #5b7a5b var(--pct), #e8e6df var(--pct));
        }
        .lumina-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #ffffff;
          border: 2px solid #5b7a5b;
          box-shadow: 0 2px 10px rgba(0,0,0,0.12);
          cursor: pointer;
        }
        .lumina-range::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #ffffff;
          border: 2px solid #5b7a5b;
          box-shadow: 0 2px 10px rgba(0,0,0,0.12);
          cursor: pointer;
        }
        .lumina-range::-moz-range-track {
          height: 10px;
          border-radius: 999px;
          background: #e8e6df;
        }
      `}</style>
    </div>
  );
}
