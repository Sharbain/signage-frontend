import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { CommandStatusBar } from "./components/CommandStatusBar";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DevicesWorkspace from "./pages/DevicesWorkspace";
import DeviceControlPage from "./pages/DeviceControlPage";
import AddDevice from "./pages/AddDevice";
import ContentScheduler from "./pages/ContentScheduler";
import TemplateDesigner from "./pages/TemplateDesigner";
import SchedulePage from "./pages/SchedulePage";
import MonitorPage from "./pages/Monitor";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import GroupDetailPage from "./pages/GroupDetailPage";
import DevicesLayout from "./layouts/DevicesLayout";

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-[#f5f5f0]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <div className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<div className="p-6"><Dashboard /></div>} />
              <Route path="/devices" element={<DevicesWorkspace />} />
              <Route path="/devices/add" element={<div className="p-6"><AddDevice /></div>} />
              <Route path="/devices/:id" element={<DevicesLayout><DeviceControlPage /></DevicesLayout>} />
              <Route path="/content" element={<div className="p-6"><ContentScheduler /></div>} />
              <Route path="/template" element={<div className="p-6"><TemplateDesigner /></div>} />
              <Route path="/schedule" element={<div className="p-6"><SchedulePage /></div>} />
              <Route path="/monitor" element={<div className="p-6"><MonitorPage /></div>} />
              <Route path="/clients" element={<div className="p-6"><ClientsPage /></div>} />
              <Route path="/clients/:id" element={<div className="p-6"><ClientDetailPage /></div>} />
              <Route path="/groups" element={<Navigate to="/devices" replace />} />
              <Route path="/groups/new" element={<div className="p-6"><GroupDetailPage /></div>} />
              <Route path="/groups/:groupId" element={<div className="p-6"><GroupDetailPage /></div>} />
              <Route path="/device-map" element={<Navigate to="/devices" replace />} />
              <Route path="/login" element={<div className="p-6"><Login /></div>} />
            </Routes>
          </div>
        </div>
        <CommandStatusBar />
      </div>
    </Router>
  );
}

export default App;
