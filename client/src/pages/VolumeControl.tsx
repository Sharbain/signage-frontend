import { Slider } from "@/components/ui/slider";
import { useDeviceCommand } from "@/hooks/useDeviceCommand";

export function VolumeControl({ deviceId }: { deviceId: string }) {
  const command = useDeviceCommand();

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Volume</div>

      <Slider
        defaultValue={[50]}
        max={100}
        step={1}
        onValueCommit={(value) => {
          command.mutate({
            deviceId,
            type: "SET_VOLUME",
            value: value[0],
          });
        }}
      />

      {command.isPending && (
        <span className="text-xs text-muted-foreground">Sending…</span>
      )}
    </div>
  );
}
