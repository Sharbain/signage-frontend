import { Slider } from "@/components/ui/slider";
import { useDeviceCommand } from "@/hooks/useDeviceCommand";

export function BrightnessControl({ deviceId }: { deviceId: string }) {
  const command = useDeviceCommand();

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Brightness</div>

      <Slider
        defaultValue={[128]}
        max={255}
        step={1}
        onValueCommit={(value) => {
          command.mutate({
            deviceId,
            type: "SET_BRIGHTNESS",
            value: value[0],
          });
        }}
      />

      {command.isPending && (
        <span className="text-xs text-muted-foreground">
          Sending…
        </span>
      )}
    </div>
  );
}
