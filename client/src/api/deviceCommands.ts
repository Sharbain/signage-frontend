import { API_BASE, authorizedFetch } from "../lib/api";
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

  const res = await authorizedFetch(`${API_BASE}/admin/devices/${deviceId}/command`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error("Failed to send device command");
  }

  return res.json();
}
