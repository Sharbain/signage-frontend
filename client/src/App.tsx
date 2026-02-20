import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { CommandStatusBar } from "./components/CommandStatusBar";
import DevicesLayout from "./layouts/DevicesLayout";

// ✅ Lazy loaded pages (big bundle win)
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DevicesWorkspace = lazy(() => import("./pages/DevicesWorkspace"));
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

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = localStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f5f5f0]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
      <CommandStatusBar />
    </div>
  );
}

function PageFallback() {
  return (
    <div className="p-6">
      <div className="animate-pulse text-[#6b6b6b]">Loading...</div>
    </div>
  );
}

function App() {
  return (
    <Router>
      {/* ✅ Suspense wraps the whole router so lazy pages load safely */}
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
          <Route
            path="/"
            element={
              <RequireAuth>
                <Shell>
                  <div className="p-6">
                    <Dashboard />
                  </div>
                </Shell>
              </RequireAuth>
            }
          />

          <Route
            path="/devices"
            element={
              <RequireAuth>
                <Shell>
                  <DevicesWorkspace />
                </Shell>
              </RequireAuth>
            }
          />

          <Route
            path="/devices/add"
            element={
              <RequireAuth>
                <Shell>
                  <div className="p-6">
                    <AddDevice />
                  </div>
                </Shell>
              </RequireAuth>
            }
          />

          <Route
            path="/devices/:id"
            element={
              <RequireAuth>
                <Shell>
                  <DevicesLayout>
                    <DeviceControlPage />
                  </DevicesLayout>
                </Shell>
              </RequireAuth>
            }
          />

          <Route
            path="/content"
            element={
              <RequireAuth>
                <Shell>
                  <div className="p-6">
                    <ContentScheduler />
                  </div>
                </Shell>
              </RequireAuth>
            }
          />

          <Route
            path="/template"
            element={
              <RequireAuth>
                <Shell>
                  <div className="p-6">
                    <TemplateDesigner />
                  </div>
                </Shell>
              </RequireAuth>
            }
          />

          <Route
            path="/schedule"
            element={
              <RequireAuth>
                <Shell>
                  <div className="p-6">
                    <SchedulePage />
                  </div>
                </Shell>
              </RequireAuth>
            }
          />

          <Route
            path="/monitor"
            element={
              <RequireAuth>
                <Shell>
                  <div className="p-6">
                    <MonitorPage />
                  </div>
                </Shell>
              </RequireAuth>
            }
          />

          <Route
            path="/clients"
            element={
              <RequireAuth>
                <Shell>
                  <div className="p-6">
                    <ClientsPage />
                  </div>
                </Shell>
              </RequireAuth>
            }
          />

          <Route
            path="/clients/:id"
            element={
              <RequireAuth>
                <Shell>
                  <div className="p-6">
                    <ClientDetailPage />
                  </div>
                </Shell>
              </RequireAuth>
            }
          />

          <Route
            path="/groups"
            element={
              <RequireAuth>
                <Navigate to="/devices" replace />
              </RequireAuth>
            }
          />

          <Route
            path="/groups/new"
            element={
              <RequireAuth>
                <Shell>
                  <div className="p-6">
                    <GroupDetailPage />
                  </div>
                </Shell>
              </RequireAuth>
            }
          />

          <Route
            path="/groups/:groupId"
            element={
              <RequireAuth>
                <Shell>
                  <div className="p-6">
                    <GroupDetailPage />
                  </div>
                </Shell>
              </RequireAuth>
            }
          />

          <Route
            path="/device-map"
            element={
              <RequireAuth>
                <Navigate to="/devices" replace />
              </RequireAuth>
            }
          />

          <Route
            path="/admin/users"
            element={
              <RequireAuth>
                <Shell>
                  <AdminUsers />
                </Shell>
              </RequireAuth>
            }
          />

          {/* catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
