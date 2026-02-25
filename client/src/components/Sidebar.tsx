import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Monitor,
  MapPin,
  Image,
  CalendarDays,
  Users,
  Activity,
} from "lucide-react";

export default function Sidebar() {
  const menu = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/", exact: true },
    { label: "Devices", icon: Monitor, path: "/devices" },
    { label: "Device Map", icon: MapPin, path: "/device-map" },
    { label: "Content", icon: Image, path: "/content" },
    { label: "Schedule", icon: CalendarDays, path: "/schedule" },
    { label: "Monitor", icon: Activity, path: "/monitor" },
    { label: "Clients", icon: Users, path: "/clients" },
    { label: "Admin Users", icon: Users, path: "/admin/users" },
  ];

  return (
    <div
      className="w-64 h-screen p-6 flex flex-col gap-8 text-white"
      style={{
        background: "linear-gradient(180deg, #5b7a5b 0%, #4a6349 100%)",
      }}
    >
      <h1 className="text-2xl font-bold text-white">Lumina CMS</h1>

      <nav className="flex flex-col gap-2">
        {menu.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact === true} // ✅ only exact match for "/"
              className={({ isActive }) =>
                `flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition
                 ${
                   isActive
                     ? "bg-white/20 text-white"
                     : "text-white/80 hover:bg-white/10 hover:text-white"
                 }`
              }
            >
              <Icon size={20} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
