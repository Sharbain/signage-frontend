import { useState, useEffect } from "react";
import { Loader2, Monitor as MonitorIcon, CheckCircle2, XCircle, Clock, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

interface PublishJob {
  id: number;
  deviceId: string;
  deviceName: string;
  contentType: string;
  contentId: number;
  contentName: string;
  status: "pending" | "downloading" | "completed" | "failed";
  progress: number;
  totalBytes: number | null;
  downloadedBytes: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface Device {
  id: string;
  name: string;
  is_online: boolean;
  status: string;
  errors?: string[];
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

function DeviceStatusIndicator({ device }: { device: Device | undefined }) {
  if (!device) {
    return <span className="w-2.5 h-2.5 rounded-full bg-slate-300" title="Unknown" />;
  }
  
  const hasErrors = device.errors && device.errors.length > 0;
  
  if (!device.is_online) {
    return <span className="w-2.5 h-2.5 rounded-full bg-red-500" title="Offline" />;
  }
  
  if (hasErrors) {
    return <span className="w-2.5 h-2.5 rounded-full bg-orange-500" title="Issues" />;
  }
  
  return <span className="w-2.5 h-2.5 rounded-full bg-green-500" title="Online" />;
}

export default function MonitorPage() {
  const [jobs, setJobs] = useState<PublishJob[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);

  async function loadJobs() {
    try {
      const res = await fetch("/api/publish-jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (err) {
      console.error("Failed to load publish jobs:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDevices() {
    try {
      const res = await fetch("/api/devices/list-full");
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch (err) {
      console.error("Failed to load devices:", err);
    }
  }

  useEffect(() => {
    loadJobs();
    loadDevices();
    const interval = setInterval(() => {
      loadJobs();
      loadDevices();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredJobs = jobs.filter(job => {
    if (filter === "active") return job.status === "pending" || job.status === "downloading";
    if (filter === "completed") return job.status === "completed" || job.status === "failed";
    return true;
  });

  const activeCount = jobs.filter(j => j.status === "pending" || j.status === "downloading").length;

  function getStatusIcon(status: string) {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "downloading":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "failed":
        return "bg-red-100 text-red-700";
      case "downloading":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  function toggleJobSelection(jobId: number) {
    setSelectedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  }

  function toggleSelectAll() {
    if (selectedJobs.size === filteredJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(filteredJobs.map(j => j.id)));
    }
  }

  async function handleDeleteSelected() {
    if (selectedJobs.size === 0) return;
    
    if (!confirm(`Delete ${selectedJobs.size} selected job(s)?`)) return;
    
    setDeleting(true);
    try {
      const jobIds = Array.from(selectedJobs);
      for (const jobId of jobIds) {
        await fetch(`/api/publish-jobs/${jobId}`, { method: "DELETE" });
      }
      setSelectedJobs(new Set());
      loadJobs();
    } catch (err) {
      console.error("Failed to delete jobs:", err);
      alert("Failed to delete some jobs");
    } finally {
      setDeleting(false);
    }
  }

  function getDeviceForJob(job: PublishJob): Device | undefined {
    return devices.find(d => d.id === job.deviceId);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MonitorIcon className="w-8 h-8 text-slate-700" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Content Monitor</h1>
            <p className="text-sm text-slate-500">
              Track content publishing and download progress across all devices
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {selectedJobs.size > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDeleteSelected}
              disabled={deleting}
              data-testid="btn-delete-selected"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete ({selectedJobs.size})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { loadJobs(); loadDevices(); }} data-testid="btn-refresh-monitor">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            data-testid="btn-filter-all"
          >
            All ({jobs.length})
          </Button>
          <Button
            variant={filter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("active")}
            data-testid="btn-filter-active"
          >
            Active ({activeCount})
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("completed")}
            data-testid="btn-filter-completed"
          >
            Completed ({jobs.length - activeCount})
          </Button>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span>Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span>Issues</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Offline</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200">
          <MonitorIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">No publish jobs</h3>
          <p className="text-sm text-slate-500">
            {filter === "all" 
              ? "When you publish content to devices, you'll see the progress here."
              : `No ${filter} jobs found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <Checkbox 
              checked={selectedJobs.size === filteredJobs.length && filteredJobs.length > 0}
              onCheckedChange={toggleSelectAll}
              data-testid="checkbox-select-all"
            />
            <span className="text-sm text-slate-600">
              {selectedJobs.size > 0 
                ? `${selectedJobs.size} selected` 
                : "Select all"}
            </span>
          </div>
          
          {filteredJobs.map((job) => {
            const device = getDeviceForJob(job);
            return (
              <div
                key={job.id}
                className={`bg-white border rounded-xl p-4 hover:shadow-sm transition-shadow cursor-pointer ${
                  selectedJobs.has(job.id) ? "border-blue-400 bg-blue-50/30" : "border-slate-200"
                }`}
                onClick={() => toggleJobSelection(job.id)}
                data-testid={`job-card-${job.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 pt-1">
                    <Checkbox 
                      checked={selectedJobs.has(job.id)}
                      onCheckedChange={() => toggleJobSelection(job.id)}
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`checkbox-job-${job.id}`}
                    />
                  </div>
                  
                  <div className="flex-shrink-0 pt-1">
                    {getStatusIcon(job.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <DeviceStatusIndicator device={device} />
                      <h3 className="font-medium text-slate-900 truncate">{job.deviceName}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(job.status)}`}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-2">
                      Publishing: <span className="font-medium">{job.contentName}</span>
                      <span className="text-slate-400 ml-2">({job.contentType})</span>
                    </p>
                    
                    {(job.status === "downloading" || job.status === "pending") && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Progress</span>
                          <span>{job.progress}%</span>
                        </div>
                        <Progress value={job.progress} className="h-2" />
                        {job.totalBytes && (
                          <div className="text-xs text-slate-400">
                            {formatBytes(job.downloadedBytes)} / {formatBytes(job.totalBytes)}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {job.status === "failed" && job.errorMessage && (
                      <p className="text-sm text-red-600 mt-2">
                        Error: {job.errorMessage}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-slate-400">
                      {formatTimeAgo(job.startedAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
