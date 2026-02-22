import { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { CommandStatusBar } from "./components/CommandStatusBar";
import DevicesLayout from "./layouts/DevicesLayout";

// Lazy pages
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Devices = lazy(() => import("./pages/Devices"));
const DeviceControlPage = lazy(() => import("./pages/DeviceControlPage"));
const AddDevice = lazy(() => import("./pages/AddDevice"));
const ContentScheduler = lazy(() => import("./pages/ContentScheduler"));
const TemplateDesigner = lazy(() => import("./pages/TemplateDesigner"));
const SchedulePage = lazy(() => import("./pages/SchedulePage"));
const MonitorPage = lazy(() => import("./pages/Monitor"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const ClientDetailPage = lazy(() => import("./pages/ClientDetailPage"));
const GroupDetailPage = lazy(() => import("./pages/GroupDetailPage"));

function PageFallback() {
  return (
    <div className="p-6">
      <div className="animate-pulse text-[#6b6b6b]">Loading...</div>
    </div>
  );
}

function RequireAuth() {
  const location = useLocation();
  const token = localStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

function ShellLayout() {
  return (
    <div className="flex min-h-screen bg-[#f5f5f0]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
      <CommandStatusBar />
    </div>
  );
}

function Padded() {
  return (
    <div className="p-6">
      <Outlet />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={
              <div className="min-h-screen bg-[#f5f5f0] p-6">
                <Login />
              </div>
            }
          />

          {/* Protected */}
          <Route element={<RequireAuth />}>
            <Route element={<ShellLayout />}>
              {/* Dashboard */}
              <Route element={<Padded />}>
                <Route index element={<Dashboard />} />
                <Route path="content" element={<ContentScheduler />} />
                <Route path="template" element={<TemplateDesigner />} />
                <Route path="schedule" element={<SchedulePage />} />
                <Route path="monitor" element={<MonitorPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="clients/:id" element={<ClientDetailPage />} />
                <Route path="groups/new" element={<GroupDetailPage />} />
                <Route path="groups/:groupId" element={<GroupDetailPage />} />
              </Route>

              {/* Devices (no forced padding because DevicesLayout may handle it) */}
              <Route path="devices" element={<Devices />} />
              <Route
                path="devices/add"
                element={
                  <div className="p-6">
                    <AddDevice />
                  </div>
                }
              />
              <Route
                path="devices/:id"
                element={
                  <DevicesLayout>
                    <DeviceControlPage />
                  </DevicesLayout>
                }
              />

              {/* Aliases / redirects */}
              <Route path="groups" element={<Navigate to="/devices" replace />} />
              <Route path="device-map" element={<Navigate to="/devices" replace />} />

              <Route path="admin/users" element={<AdminUsers />} />
            </Route>
          </Route>

          {/* catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
