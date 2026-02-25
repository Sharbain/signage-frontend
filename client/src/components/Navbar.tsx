import { Globe, Bell, User, LogOut } from "lucide-react";

export default function Navbar() {
  return (
    <div className="bg-white p-4 flex justify-between items-center shadow-sm border-b border-[#e0ddd5]">
      <h2 className="font-bold text-lg text-[#5b7a5b]">Welcome, Admin</h2>

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="p-2 hover:bg-[#f5f5f0] rounded-lg transition"
        >
          <Globe className="w-5 h-5 text-[#6b6b6b]" />
        </button>

        <button
          type="button"
          className="p-2 hover:bg-[#f5f5f0] rounded-lg transition relative"
        >
          <Bell className="w-5 h-5 text-[#6b6b6b]" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#b5836d] rounded-full" />
        </button>

        <button
          type="button"
          className="p-2 hover:bg-[#f5f5f0] rounded-lg transition"
        >
          <User className="w-5 h-5 text-[#6b6b6b]" />
        </button>

        <button
          type="button"
          className="p-2 hover:bg-[#f5f5f0] rounded-lg transition flex items-center gap-2"
          onClick={() => {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("user");
            window.location.href = "/login";
          }}
        >
          <LogOut className="w-4 h-4 text-[#6b6b6b]" />
          <span className="text-[#6b6b6b]">Logout</span>
        </button>
      </div>
    </div>
  );
}
