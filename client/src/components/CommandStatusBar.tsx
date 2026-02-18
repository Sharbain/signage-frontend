import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { X, Check, Loader2, Upload, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface ActiveCommand {
  id: number;
  deviceId: string;
  deviceName: string;
  type: string;
  contentName: string;
  status: "queued" | "delivering" | "completed";
  progress: number;
  createdAt: string;
  executedAt: string | null;
}

export function CommandStatusBar() {
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const [visible, setVisible] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/commands/active"],
    queryFn: async () => {
      const res = await fetch("/api/commands/active");
      if (!res.ok) throw new Error("Failed to fetch active commands");
      return res.json();
    },
    refetchInterval: 2000,
  });

  const commands: ActiveCommand[] = data?.commands || [];
  const activeCommands = commands.filter(
    (cmd) => !dismissedIds.has(cmd.id) && cmd.status !== "completed"
  );
  const recentCompleted = commands.filter(
    (cmd) => !dismissedIds.has(cmd.id) && cmd.status === "completed"
  );

  useEffect(() => {
    if (activeCommands.length > 0 || recentCompleted.length > 0) {
      setVisible(true);
    }
  }, [activeCommands.length, recentCompleted.length]);

  useEffect(() => {
    recentCompleted.forEach((cmd) => {
      const timer = setTimeout(() => {
        setDismissedIds((prev) => new Set(Array.from(prev).concat(cmd.id)));
      }, 5000);
      return () => clearTimeout(timer);
    });
  }, [recentCompleted]);

  const dismissCommand = (id: number) => {
    setDismissedIds((prev) => new Set(Array.from(prev).concat(id)));
  };

  const dismissAll = () => {
    const allIds = [...activeCommands, ...recentCompleted].map((cmd) => cmd.id);
    setDismissedIds(new Set(Array.from(dismissedIds).concat(allIds)));
    setVisible(false);
  };

  const visibleCommands = [...activeCommands, ...recentCompleted];

  if (!visible || visibleCommands.length === 0) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "queued":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "delivering":
        return <Upload className="h-4 w-4 text-yellow-500" />;
      case "completed":
        return <Check className="h-4 w-4 text-green-500" />;
      default:
        return <Monitor className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "queued":
        return "Queued";
      case "delivering":
        return "Delivering";
      case "completed":
        return "Completed";
      default:
        return status;
    }
  };

  return (
    <div
      data-testid="command-status-bar"
      className="fixed bottom-4 right-4 z-50 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <span className="text-sm font-medium text-slate-900 dark:text-white">
          Content Transfers ({visibleCommands.length})
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={dismissAll}
          className="h-6 w-6 p-0"
          data-testid="dismiss-all-commands"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {visibleCommands.map((cmd) => (
          <div
            key={cmd.id}
            data-testid={`command-item-${cmd.id}`}
            className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(cmd.status)}
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[180px]">
                    {cmd.contentName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    → {cmd.deviceName}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissCommand(cmd.id)}
                className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
                data-testid={`dismiss-command-${cmd.id}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Progress value={cmd.progress} className="h-1.5 flex-1" />
              <span className="text-xs text-slate-500 dark:text-slate-400 min-w-[60px] text-right">
                {getStatusLabel(cmd.status)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {isLoading && visibleCommands.length === 0 && (
        <div className="px-4 py-3 text-center text-sm text-slate-500">
          Loading...
        </div>
      )}
    </div>
  );
}
