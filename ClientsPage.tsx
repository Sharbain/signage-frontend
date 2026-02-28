import { useMutation } from "@tanstack/react-query";
import { sendDeviceCommand } from "@/api/deviceCommands";

export function useDeviceCommand() {
  return useMutation({
    mutationFn: sendDeviceCommand,
  });
}
