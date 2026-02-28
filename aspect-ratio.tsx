import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  Calendar as CalendarIcon,
  Monitor,
  Film,
  ListMusic,
  Layout,
  Loader2,
  Folder,
  FolderOpen,
  Check,
  Send,
} from "lucide-react";

interface ContentSchedule {
  id: number;
  title: string;
  content_type: string;
  content_id: string;
  device_id: string | null;
  group_id: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  repeat_type: string;
  repeat_end_date: string | null;
  color: string;
  content_name?: string;
  device_name?: string;
  group_name?: string;
}

interface ContentOption {
  id: number | string;
  name: string;
  type?: string;
  url?: string;
  description?: string;
}

interface ContentOptions {
  media: ContentOption[];
  playlists: ContentOption[];
  templates: ContentOption[];
}

interface Device {
  id: string;
  name: string;
  device_id?: string;
}

interface DeviceGroup {
  id: string;
  name: string;
  parent_id?: string | null;
  device_count?: number;
  subgroup_count?: number;
}

export default function ScheduleCalendar() {
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<ContentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentOptions, setContentOptions] = useState<ContentOptions>({
    media: [],
    playlists: [],
    templates: [],
  });
  const [devices, setDevices] = useState<Device[]>([]);
  const [groups, setGroups] = useState<DeviceGroup[]>([]);

  const [showDialog, setShowDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ContentSchedule | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [draggedSchedule, setDraggedSchedule] = useState<ContentSchedule | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ dayIndex: number; hour: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [resizing, setResizing] = useState<{ scheduleId: number; edge: "top" | "bottom"; startY: number; originalStart: Date; originalEnd: Date } | null>(null);
  
  const [groupBreadcrumbs, setGroupBreadcrumbs] = useState<DeviceGroup[]>([]);
  const [currentGroupChildren, setCurrentGroupChildren] = useState<DeviceGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    contentType: "media",
    contentId: "",
    targetType: "device",
    deviceId: "",
    groupId: "",
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "17:00",
    allDay: false,
    repeatType: "none",
    repeatEndDate: "",
    color: "#3b82f6",
  });

  const colorOptions = [
    { value: "#3b82f6", label: "Blue" },
    { value: "#22c55e", label: "Green" },
    { value: "#f59e0b", label: "Orange" },
    { value: "#ef4444", label: "Red" },
    { value: "#8b5cf6", label: "Purple" },
    { value: "#06b6d4", label: "Cyan" },
    { value: "#ec4899", label: "Pink" },
  ];

  useEffect(() => {
    loadSchedules();
    loadContentOptions();
    loadDevices();
    loadGroups();
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [currentDate, view]);

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizing.startY;
      const hourHeight = 48;
      const minutesDelta = Math.round((deltaY / hourHeight) * 60 / 15) * 15;

      const schedule = schedules.find(s => s.id === resizing.scheduleId);
      if (!schedule) return;

      if (resizing.edge === "top") {
        const newStart = new Date(resizing.originalStart.getTime() + minutesDelta * 60000);
        if (newStart < resizing.originalEnd) {
          setSchedules(prev => prev.map(s => 
            s.id === resizing.scheduleId 
              ? { ...s, start_time: newStart.toISOString() }
              : s
          ));
        }
      } else {
        const newEnd = new Date(resizing.originalEnd.getTime() + minutesDelta * 60000);
        if (newEnd > resizing.originalStart) {
          setSchedules(prev => prev.map(s => 
            s.id === resizing.scheduleId 
              ? { ...s, end_time: newEnd.toISOString() }
              : s
          ));
        }
      }
    };

    const handleMouseUp = async () => {
      const schedule = schedules.find(s => s.id === resizing.scheduleId);
      if (schedule) {
        try {
          await fetch(`/api/content-schedules/${schedule.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: schedule.title,
              contentType: schedule.content_type,
              contentId: schedule.content_id,
              deviceId: schedule.device_id,
              groupId: schedule.group_id,
              startTime: schedule.start_time,
              endTime: schedule.end_time,
              allDay: schedule.all_day,
              repeatType: schedule.repeat_type,
              repeatEndDate: schedule.repeat_end_date,
              color: schedule.color,
            }),
          });
        } catch (err) {
          console.error("Failed to save resize:", err);
          loadSchedules();
        }
      }
      setResizing(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing, schedules]);

  async function loadSchedules() {
    setLoading(true);
    try {
      const start = getViewStart();
      const end = getViewEnd();
      const res = await fetch(
        `/api/content-schedules?start=${start.toISOString()}&end=${end.toISOString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
    } catch (err) {
      console.error("Failed to load schedules:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadContentOptions() {
    try {
      const res = await fetch("/api/content-options");
      if (res.ok) {
        const data = await res.json();
        setContentOptions(data);
      }
    } catch (err) {
      console.error("Failed to load content options:", err);
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

  async function loadGroups() {
    try {
      const res = await fetch("/api/device-groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data || []);
      }
    } catch (err) {
      console.error("Failed to load groups:", err);
    }
  }

  async function loadGroupChildren(parentId?: string) {
    setLoadingGroups(true);
    try {
      const url = parentId 
        ? `/api/groups/${parentId}/subgroups`
        : "/api/device-groups";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCurrentGroupChildren(data || []);
      }
    } catch (err) {
      console.error("Failed to load group children:", err);
    } finally {
      setLoadingGroups(false);
    }
  }

  function navigateToGroup(group: DeviceGroup) {
    setGroupBreadcrumbs(prev => [...prev, group]);
    loadGroupChildren(group.id);
  }

  function navigateBack() {
    const newBreadcrumbs = [...groupBreadcrumbs];
    newBreadcrumbs.pop();
    setGroupBreadcrumbs(newBreadcrumbs);
    const parentId = newBreadcrumbs.length > 0 ? newBreadcrumbs[newBreadcrumbs.length - 1].id : undefined;
    loadGroupChildren(parentId);
  }

  function navigateToBreadcrumb(index: number) {
    const newBreadcrumbs = groupBreadcrumbs.slice(0, index + 1);
    setGroupBreadcrumbs(newBreadcrumbs);
    const parentId = newBreadcrumbs.length > 0 ? newBreadcrumbs[newBreadcrumbs.length - 1].id : undefined;
    loadGroupChildren(parentId);
  }

  function selectGroup(group: DeviceGroup) {
    setFormData({ ...formData, groupId: group.id });
  }

  function getSelectedGroupName(): string {
    if (!formData.groupId) return "";
    const allGroups = [...groups, ...currentGroupChildren];
    const found = allGroups.find(g => g.id === formData.groupId);
    return found?.name || formData.groupId;
  }

  function getViewStart(): Date {
    const date = new Date(currentDate);
    if (view === "week") {
      const day = date.getDay();
      date.setDate(date.getDate() - day);
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function getViewEnd(): Date {
    const date = new Date(currentDate);
    if (view === "week") {
      const day = date.getDay();
      date.setDate(date.getDate() + (6 - day));
    }
    date.setHours(23, 59, 59, 999);
    return date;
  }

  function navigatePrev() {
    const date = new Date(currentDate);
    if (view === "month") {
      date.setMonth(date.getMonth() - 1);
    } else if (view === "week") {
      date.setDate(date.getDate() - 7);
    } else {
      date.setDate(date.getDate() - 1);
    }
    setCurrentDate(date);
  }

  function navigateNext() {
    const date = new Date(currentDate);
    if (view === "month") {
      date.setMonth(date.getMonth() + 1);
    } else if (view === "week") {
      date.setDate(date.getDate() + 7);
    } else {
      date.setDate(date.getDate() + 1);
    }
    setCurrentDate(date);
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const start = getViewStart();
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentDate, view]);

  const hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => i);
  }, []);

  function formatHour(hour: number): string {
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  }

  function formatDateHeader(date: Date): string {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  function getCurrentTimePosition(): number {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return ((hours * 60 + minutes) / (24 * 60)) * 100;
  }

  function getSchedulesForDay(date: Date): ContentSchedule[] {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return schedules.filter((s) => {
      const start = new Date(s.start_time);
      const end = new Date(s.end_time);
      return start <= dayEnd && end >= dayStart;
    });
  }

  function computeDayLayout(daySchedules: ContentSchedule[], dayDate: Date) {
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);

    const events = daySchedules.map((s) => {
      const start = new Date(s.start_time);
      const end = new Date(s.end_time);
      const effectiveStart = start < dayStart ? dayStart : start;
      const effectiveEnd = end > dayEnd ? dayEnd : end;
      return {
        id: s.id,
        start: effectiveStart.getTime(),
        end: effectiveEnd.getTime(),
      };
    }).sort((a, b) => a.start - b.start || a.end - b.end);

    const columns: { end: number }[] = [];
    const layout: Record<number, { column: number; totalColumns: number }> = {};

    for (const event of events) {
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        if (columns[col].end <= event.start) {
          columns[col].end = event.end;
          layout[event.id] = { column: col, totalColumns: 0 };
          placed = true;
          break;
        }
      }
      if (!placed) {
        layout[event.id] = { column: columns.length, totalColumns: 0 };
        columns.push({ end: event.end });
      }
    }

    const totalCols = columns.length;
    for (const id of Object.keys(layout)) {
      layout[Number(id)].totalColumns = totalCols;
    }

    return layout;
  }

  function getSchedulePosition(schedule: ContentSchedule, dayDate: Date, layout?: Record<number, { column: number; totalColumns: number }>) {
    const start = new Date(schedule.start_time);
    const end = new Date(schedule.end_time);
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);

    const effectiveStart = start < dayStart ? dayStart : start;
    const effectiveEnd = end > dayEnd ? dayEnd : end;

    const startMinutes = effectiveStart.getHours() * 60 + effectiveStart.getMinutes();
    const endMinutes = effectiveEnd.getHours() * 60 + effectiveEnd.getMinutes();
    
    const top = (startMinutes / (24 * 60)) * 100;
    const height = Math.max(((endMinutes - startMinutes) / (24 * 60)) * 100, 2);

    let left = 4;
    let width = 'calc(100% - 8px)';
    
    if (layout && layout[schedule.id]) {
      const { column, totalColumns } = layout[schedule.id];
      const colWidth = (100 - 8) / totalColumns;
      left = 4 + column * colWidth;
      width = `${colWidth}%`;
    }

    return { top: `${top}%`, height: `${height}%`, left: `${left}%`, width };
  }

  function openNewSchedule(date?: Date, hour?: number) {
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split("T")[0];
    const startHour = hour !== undefined ? hour : 9;
    const endHour = startHour + 1;

    setFormData({
      title: "",
      contentType: "media",
      contentId: "",
      targetType: "device",
      deviceId: "",
      groupId: "",
      startDate: dateStr,
      startTime: `${String(startHour).padStart(2, "0")}:00`,
      endDate: dateStr,
      endTime: `${String(endHour).padStart(2, "0")}:00`,
      allDay: false,
      repeatType: "none",
      repeatEndDate: "",
      color: "#3b82f6",
    });
    setEditingSchedule(null);
    setGroupBreadcrumbs([]);
    loadGroupChildren();
    setShowDialog(true);
  }

  function openEditSchedule(schedule: ContentSchedule) {
    const start = new Date(schedule.start_time);
    const end = new Date(schedule.end_time);

    setFormData({
      title: schedule.title,
      contentType: schedule.content_type,
      contentId: schedule.content_id,
      targetType: schedule.device_id ? "device" : schedule.group_id ? "group" : "device",
      deviceId: schedule.device_id || "",
      groupId: schedule.group_id || "",
      startDate: start.toISOString().split("T")[0],
      startTime: start.toTimeString().slice(0, 5),
      endDate: end.toISOString().split("T")[0],
      endTime: end.toTimeString().slice(0, 5),
      allDay: schedule.all_day,
      repeatType: schedule.repeat_type,
      repeatEndDate: schedule.repeat_end_date
        ? new Date(schedule.repeat_end_date).toISOString().split("T")[0]
        : "",
      color: schedule.color,
    });
    setEditingSchedule(schedule);
    setGroupBreadcrumbs([]);
    loadGroupChildren();
    setShowDialog(true);
  }

  async function handleSave(publish: boolean = false) {
    if (!formData.title || !formData.contentId) {
      alert("Please fill in title and select content");
      return;
    }

    if (publish) {
      setPublishing(true);
    } else {
      setSaving(true);
    }
    try {
      const startTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endTime = new Date(`${formData.endDate}T${formData.endTime}`);

      const payload = {
        title: formData.title,
        contentType: formData.contentType,
        contentId: formData.contentId,
        deviceId: formData.targetType === "device" ? formData.deviceId : null,
        groupId: formData.targetType === "group" ? formData.groupId : null,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        allDay: formData.allDay,
        repeatType: formData.repeatType,
        repeatEndDate: formData.repeatEndDate
          ? new Date(formData.repeatEndDate).toISOString()
          : null,
        color: formData.color,
      };

      const url = editingSchedule
        ? `/api/content-schedules/${editingSchedule.id}`
        : "/api/content-schedules";
      const method = editingSchedule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedSchedule = await res.json();
        
        if (publish) {
          const contentName = formData.title;
          const targetDevices: { id: string; name: string }[] = [];
          
          if (formData.targetType === "device" && formData.deviceId) {
            const device = devices.find(d => d.id === formData.deviceId || d.device_id === formData.deviceId);
            if (device) {
              targetDevices.push({ id: device.device_id || device.id, name: device.name });
            }
          } else if (formData.targetType === "group" && formData.groupId) {
            try {
              const groupDevicesRes = await fetch(`/api/device-groups/${formData.groupId}/devices`);
              if (groupDevicesRes.ok) {
                const groupDevices = await groupDevicesRes.json();
                for (const d of groupDevices) {
                  targetDevices.push({ id: d.device_id || d.id, name: d.name });
                }
              }
            } catch (e) {
              console.error("Failed to get group devices:", e);
            }
          }
          
          for (const device of targetDevices) {
            await fetch("/api/publish-jobs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                deviceId: device.id,
                deviceName: device.name,
                contentType: "schedule",
                contentId: savedSchedule.id || 0,
                contentName: contentName,
                totalBytes: null,
              }),
            });
          }
          
          setShowDialog(false);
          setEditingSchedule(null);
          window.location.href = "/monitor";
        } else {
          setShowDialog(false);
          setEditingSchedule(null);
          loadSchedules();
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save schedule");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save schedule");
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  }

  async function handleDelete() {
    if (!editingSchedule) return;
    if (!confirm("Delete this schedule?")) return;

    try {
      const res = await fetch(`/api/content-schedules/${editingSchedule.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setShowDialog(false);
        setEditingSchedule(null);
        loadSchedules();
      } else {
        alert("Failed to delete schedule");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete schedule");
    }
  }

  function handleCellClick(date: Date, hour: number) {
    openNewSchedule(date, hour);
  }

  function handleDragStart(e: React.DragEvent, schedule: ContentSchedule) {
    e.dataTransfer.setData("scheduleId", schedule.id.toString());
    e.dataTransfer.effectAllowed = "move";
    setDraggedSchedule(schedule);
    const target = e.target as HTMLElement;
    target.style.opacity = "0.5";
  }

  function handleDragEnd(e: React.DragEvent) {
    const target = e.target as HTMLElement;
    target.style.opacity = "1";
    setDraggedSchedule(null);
    setDragOverCell(null);
  }

  function handleDragOver(e: React.DragEvent, dayIndex: number, hour: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCell({ dayIndex, hour });
  }

  function handleDragLeave() {
    setDragOverCell(null);
  }

  async function handleDrop(e: React.DragEvent, date: Date, hour: number) {
    e.preventDefault();
    setDragOverCell(null);
    setDraggedSchedule(null);
    
    const scheduleId = e.dataTransfer.getData("scheduleId");
    if (!scheduleId) return;

    const schedule = schedules.find((s) => s.id === parseInt(scheduleId));
    if (!schedule) return;

    const oldStart = new Date(schedule.start_time);
    const oldEnd = new Date(schedule.end_time);
    const duration = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(date);
    newStart.setHours(hour, 0, 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);

    setSchedules(prev => prev.map(s => 
      s.id === schedule.id 
        ? { ...s, start_time: newStart.toISOString(), end_time: newEnd.toISOString() }
        : s
    ));

    try {
      const res = await fetch(`/api/content-schedules/${schedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: schedule.title,
          contentType: schedule.content_type,
          contentId: schedule.content_id,
          deviceId: schedule.device_id,
          groupId: schedule.group_id,
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
          allDay: schedule.all_day,
          repeatType: schedule.repeat_type,
          repeatEndDate: schedule.repeat_end_date,
          color: schedule.color,
        }),
      });

      if (!res.ok) {
        setSchedules(prev => prev.map(s => 
          s.id === schedule.id 
            ? { ...s, start_time: oldStart.toISOString(), end_time: oldEnd.toISOString() }
            : s
        ));
      }
    } catch (err) {
      console.error("Drop error:", err);
      setSchedules(prev => prev.map(s => 
        s.id === schedule.id 
          ? { ...s, start_time: oldStart.toISOString(), end_time: oldEnd.toISOString() }
          : s
      ));
    }
  }

  function getContentIcon(type: string) {
    switch (type) {
      case "media":
        return <Film className="h-3 w-3" />;
      case "playlist":
        return <ListMusic className="h-3 w-3" />;
      case "template":
        return <Layout className="h-3 w-3" />;
      default:
        return <Film className="h-3 w-3" />;
    }
  }

  const currentContentOptions = useMemo(() => {
    switch (formData.contentType) {
      case "media":
        return contentOptions.media;
      case "playlist":
        return contentOptions.playlists;
      case "template":
        return contentOptions.templates;
      default:
        return [];
    }
  }, [formData.contentType, contentOptions]);

  return (
    <div className="h-full flex flex-col" data-testid="schedule-calendar">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={navigatePrev} data-testid="button-prev">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-today">
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={navigateNext} data-testid="button-next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-4 text-lg font-semibold text-foreground">
            {view === "month"
              ? currentDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })
              : view === "week"
              ? `${weekDays[0].toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })} - ${weekDays[6].toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}`
              : currentDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Select value={view} onValueChange={(v: "month" | "week" | "day") => setView(v)}>
            <SelectTrigger className="w-32" data-testid="select-view">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => openNewSchedule()} data-testid="button-add-schedule">
            <Plus className="h-4 w-4 mr-2" />
            Add Schedule
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : view === "month" ? (
        <Card className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto p-4">
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              {(() => {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                const startPadding = firstDay.getDay();
                const daysInMonth = lastDay.getDate();
                const cells: React.ReactNode[] = [];
                
                for (let i = 0; i < startPadding; i++) {
                  cells.push(<div key={`pad-${i}`} className="min-h-[100px] bg-muted/30 rounded" />);
                }
                
                for (let day = 1; day <= daysInMonth; day++) {
                  const dayDate = new Date(year, month, day);
                  const daySchedules = getSchedulesForDay(dayDate);
                  const isTodayDate = isToday(dayDate);
                  
                  cells.push(
                    <div
                      key={day}
                      className={`min-h-[100px] border rounded p-1 cursor-pointer hover:bg-muted/50 transition-colors ${
                        isTodayDate ? "bg-primary/10 border-primary" : "border-border"
                      }`}
                      onClick={() => {
                        setCurrentDate(dayDate);
                        setView("day");
                      }}
                    >
                      <div className={`text-sm font-medium mb-1 ${isTodayDate ? "text-primary" : ""}`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {daySchedules.slice(0, 3).map((schedule) => (
                          <div
                            key={schedule.id}
                            className="text-[10px] px-1 py-0.5 rounded truncate text-white"
                            style={{ backgroundColor: schedule.color }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditSchedule(schedule);
                            }}
                          >
                            {schedule.title}
                          </div>
                        ))}
                        {daySchedules.length > 3 && (
                          <div className="text-[10px] text-muted-foreground">
                            +{daySchedules.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                
                return cells;
              })()}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto">
            <div className="min-w-[800px]">
              <div
                className="grid sticky top-0 bg-background border-b z-10"
                style={{
                  gridTemplateColumns: view === "week" ? "60px repeat(7, 1fr)" : "60px 1fr",
                }}
              >
                <div className="p-2 border-r text-center text-xs text-muted-foreground">
                  Time
                </div>
                {view === "week" ? (
                  weekDays.map((day, i) => (
                    <div
                      key={i}
                      className={`p-2 text-center border-r last:border-r-0 ${
                        isToday(day)
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground"
                      }`}
                    >
                      {formatDateHeader(day)}
                    </div>
                  ))
                ) : (
                  <div
                    className={`p-2 text-center ${
                      isToday(currentDate)
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground"
                    }`}
                  >
                    {formatDateHeader(currentDate)}
                  </div>
                )}
              </div>

              <div
                className="grid"
                style={{
                  gridTemplateColumns: view === "week" ? "60px repeat(7, 1fr)" : "60px 1fr",
                }}
              >
                <div className="border-r">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="h-12 border-b text-xs text-muted-foreground text-right pr-2 pt-1"
                    >
                      {formatHour(hour)}
                    </div>
                  ))}
                </div>

                {(view === "week" ? weekDays : [currentDate]).map((day, dayIndex) => (
                  <div key={dayIndex} className="border-r last:border-r-0 relative">
                    {hours.map((hour) => {
                      const isDropTarget = dragOverCell?.dayIndex === dayIndex && dragOverCell?.hour === hour;
                      return (
                        <div
                          key={hour}
                          className={`h-12 border-b cursor-pointer transition-colors ${
                            isDropTarget
                              ? "bg-primary/20 border-primary border-2"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => handleCellClick(day, hour)}
                          onDragOver={(e) => handleDragOver(e, dayIndex, hour)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, day, hour)}
                          data-testid={`cell-${dayIndex}-${hour}`}
                        />
                      );
                    })}

                    {isToday(day) && (
                      <div
                        className="absolute left-0 right-0 z-20 pointer-events-none"
                        style={{ top: `${getCurrentTimePosition()}%` }}
                      >
                        <div className="relative flex items-center">
                          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                          <div className="flex-1 h-0.5 bg-red-500" />
                        </div>
                      </div>
                    )}

                    {(() => {
                      const daySchedules = getSchedulesForDay(day);
                      const layout = computeDayLayout(daySchedules, day);
                      
                      return daySchedules.map((schedule) => {
                        const position = getSchedulePosition(schedule, day, layout);
                        const start = new Date(schedule.start_time);
                        const end = new Date(schedule.end_time);
                        const startTimeStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                        const endTimeStr = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                        
                        return (
                          <div
                            key={schedule.id}
                            className="absolute rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
                            style={{
                              top: position.top,
                              height: position.height,
                              left: position.left,
                              width: position.width,
                              minHeight: "28px",
                            }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, schedule)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditSchedule(schedule);
                          }}
                          data-testid={`schedule-${schedule.id}`}
                        >
                          <div 
                            className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
                            style={{ backgroundColor: schedule.color }}
                          />
                          
                          <div 
                            className="h-full pl-2 pr-1 py-1 text-xs"
                            style={{ 
                              backgroundColor: `${schedule.color}20`,
                              borderLeft: `3px solid ${schedule.color}`
                            }}
                          >
                            <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {getContentIcon(schedule.content_type)}
                              <span className="truncate">{schedule.title}</span>
                            </div>
                            <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                              {startTimeStr} - {endTimeStr}
                            </div>
                            {schedule.content_name && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {schedule.content_name}
                              </div>
                            )}
                          </div>

                          <div 
                            className="absolute top-0 left-0 right-0 h-2 cursor-n-resize opacity-0 group-hover:opacity-100 hover:bg-black/10"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setResizing({
                                scheduleId: schedule.id,
                                edge: "top",
                                startY: e.clientY,
                                originalStart: new Date(schedule.start_time),
                                originalEnd: new Date(schedule.end_time),
                              });
                            }}
                          />
                          <div 
                            className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize opacity-0 group-hover:opacity-100 hover:bg-black/10"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setResizing({
                                scheduleId: schedule.id,
                                edge: "bottom",
                                startY: e.clientY,
                                originalStart: new Date(schedule.start_time),
                                originalEnd: new Date(schedule.end_time),
                              });
                            }}
                          />
                        </div>
                        );
                      });
                    })()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? "Edit Schedule" : "New Schedule"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Schedule name"
                data-testid="input-title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Content Type</Label>
                <Select
                  value={formData.contentType}
                  onValueChange={(v) =>
                    setFormData({ ...formData, contentType: v, contentId: "" })
                  }
                >
                  <SelectTrigger data-testid="select-content-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="playlist">Playlist</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Content</Label>
                <Select
                  value={formData.contentId}
                  onValueChange={(v) => setFormData({ ...formData, contentId: v })}
                >
                  <SelectTrigger data-testid="select-content">
                    <SelectValue placeholder="Select content" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentContentOptions.map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target Type</Label>
                <Select
                  value={formData.targetType}
                  onValueChange={(v) =>
                    setFormData({ ...formData, targetType: v, deviceId: "", groupId: "" })
                  }
                >
                  <SelectTrigger data-testid="select-target-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="device">Device</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{formData.targetType === "device" ? "Device" : "Group"}</Label>
                {formData.targetType === "device" ? (
                  <Select
                    value={formData.deviceId}
                    onValueChange={(v) => setFormData({ ...formData, deviceId: v })}
                  >
                    <SelectTrigger data-testid="select-device">
                      <SelectValue placeholder="Select device" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((d) => (
                        <SelectItem key={d.id} value={d.device_id || d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    {formData.groupId && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          {getSelectedGroupName()}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-6 px-2 text-xs"
                          onClick={() => setFormData({ ...formData, groupId: "" })}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                    
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {groupBreadcrumbs.length > 0 && (
                        <div className="flex items-center gap-1 p-2 bg-muted/50 border-b text-xs">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => {
                              setGroupBreadcrumbs([]);
                              loadGroupChildren();
                            }}
                          >
                            All Groups
                          </Button>
                          {groupBreadcrumbs.map((crumb, i) => (
                            <span key={crumb.id} className="flex items-center">
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => navigateToBreadcrumb(i)}
                              >
                                {crumb.name}
                              </Button>
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {loadingGroups ? (
                        <div className="p-4 flex justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : currentGroupChildren.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No groups found
                        </div>
                      ) : (
                        <div className="divide-y">
                          {currentGroupChildren.map((group) => (
                            <div
                              key={group.id}
                              className={`flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer ${
                                formData.groupId === group.id ? "bg-primary/10" : ""
                              }`}
                            >
                              <div 
                                className="flex-1 flex items-center gap-2"
                                onClick={() => selectGroup(group)}
                              >
                                <Folder className="h-4 w-4 text-amber-500" />
                                <span className="text-sm">{group.name}</span>
                                {formData.groupId === group.id && (
                                  <Check className="h-4 w-4 text-green-600 ml-auto" />
                                )}
                              </div>
                              {(group.subgroup_count || 0) > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateToGroup(group);
                                  }}
                                >
                                  <FolderOpen className="h-3 w-3 mr-1" />
                                  {group.subgroup_count} subgroups
                                  <ChevronRight className="h-3 w-3 ml-1" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="allDay"
                checked={formData.allDay}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, allDay: checked as boolean })
                }
                data-testid="checkbox-all-day"
              />
              <Label htmlFor="allDay" className="cursor-pointer">
                All day
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  data-testid="input-start-date"
                />
              </div>
              {!formData.allDay && (
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    data-testid="input-start-time"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  data-testid="input-end-date"
                />
              </div>
              {!formData.allDay && (
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    data-testid="input-end-time"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Repeat</Label>
                <Select
                  value={formData.repeatType}
                  onValueChange={(v) => setFormData({ ...formData, repeatType: v })}
                >
                  <SelectTrigger data-testid="select-repeat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.repeatType !== "none" && (
                <div>
                  <Label>Repeat Until</Label>
                  <Input
                    type="date"
                    value={formData.repeatEndDate}
                    onChange={(e) => setFormData({ ...formData, repeatEndDate: e.target.value })}
                    data-testid="input-repeat-end"
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1">
                {colorOptions.map((c) => (
                  <button
                    key={c.value}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === c.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setFormData({ ...formData, color: c.value })}
                    title={c.label}
                    data-testid={`color-${c.value}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            {editingSchedule && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                data-testid="button-delete-schedule"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleSave(false)} disabled={saving || publishing} data-testid="button-save-schedule">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
              <Button onClick={() => handleSave(true)} disabled={saving || publishing} data-testid="button-publish-schedule">
                {publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Publish
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
