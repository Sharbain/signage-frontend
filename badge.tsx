import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Monitor, 
  Image as ImageIcon, 
  FileText,
  Settings,
  Bell,
  Globe,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Monitor, label: "Devices", href: "/screens" },
    { icon: ImageIcon, label: "Content", href: "/media" },
    { icon: FileText, label: "Reports", href: "/reports" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  const currentPage = navItems.find(i => i.href === location)?.label || "Dashboard";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white h-screen shadow-xl p-6 flex flex-col gap-8">
        {/* Logo */}
        <h1 className="text-2xl font-bold text-indigo-600">
          CMS
        </h1>

        {/* Menu */}
        <nav className="flex flex-col gap-2 text-gray-700">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 py-2 px-3 rounded-xl cursor-pointer transition",
                  isActive 
                    ? "bg-indigo-600 text-white" 
                    : "hover:bg-indigo-600 hover:text-white"
                )}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="mt-auto pt-6 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-indigo-600 font-semibold">A</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Admin User</p>
              <p className="text-xs text-gray-500">admin@cms.io</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <div className="w-full h-20 bg-white shadow-md flex items-center justify-between px-8">
          {/* Page Title */}
          <h2 className="text-2xl font-semibold text-gray-800">
            {currentPage}
          </h2>

          {/* Right Icons */}
          <div className="flex items-center gap-6">
            {/* Language */}
            <button className="p-2 hover:bg-gray-100 rounded-xl transition">
              <Globe className="w-6 h-6 text-gray-600" />
            </button>

            {/* Notifications */}
            <button className="p-2 hover:bg-gray-100 rounded-xl transition relative">
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Profile */}
            <button className="p-2 hover:bg-gray-100 rounded-xl transition flex items-center gap-3">
              <User className="w-6 h-6 text-gray-600" />
              <span className="text-gray-700">Admin</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
