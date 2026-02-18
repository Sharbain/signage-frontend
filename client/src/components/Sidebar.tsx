import { NavLink } from "react-router-dom";
import { LayoutDashboard, Monitor, Image, CalendarDays, Users, Activity } from "lucide-react";

export default function Sidebar() {
  const menu = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/", external: false },
    { label: "Devices", icon: Monitor, path: "/devices", external: false },
    { label: "Content", icon: Image, path: "/content", external: false },
    { label: "Schedule", icon: CalendarDays, path: "/schedule", external: false },
    { label: "Monitor", icon: Activity, path: "/monitor", external: false },
    { label: "Clients", icon: Users, path: "/clients", external: false },
  ];

  return (
    <div className="w-64 h-screen p-6 flex flex-col gap-8 text-white" style={{ background: 'linear-gradient(180deg, #5b7a5b 0%, #4a6349 100%)' }}>
      <h1 className="text-2xl font-bold text-white">Lumina CMS</h1>
      <nav className="flex flex-col gap-2">
        {menu.map((item, index) => {
          const Icon = item.icon;
          if (item.external) {
            return (
              <a
                key={index}
                href={item.path}
                className="flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition text-white/80 hover:bg-white/10 hover:text-white"
              >
                <Icon size={20} />
                {item.label}
              </a>
            );
          }
          return (
            <NavLink
              key={index}
              to={item.path}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition
                 ${isActive
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
