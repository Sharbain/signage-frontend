import ScheduleCalendar from "@/components/ScheduleCalendar";

export default function SchedulePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Content Schedule</h1>
          <p className="text-muted-foreground">Schedule and manage content playback across your devices</p>
        </div>
      </div>
      
      <ScheduleCalendar />
    </div>
  );
}
