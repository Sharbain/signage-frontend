export type DeviceCommandType =
  | "SET_BRIGHTNESS"
  | "SET_VOLUME"
  | "MUTE"
  | "UNMUTE"
  | "RESTART_APP"
  | "SCREEN_OFF"
  | "SCREEN_ON";

interface SendCommandParams {
  deviceId: string;
  type: DeviceCommandType;
  value?: number;
}

export async function sendDeviceCommand({
  deviceId,
  type,
  value,
}: SendCommandParams) {
  const body =
    value !== undefined
      ? { type, value }
      : { type };

  const res = await fetch(`/api/device/${deviceId}/command`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error("Failed to send device command");
  }

  return res.json();
}
