
import { useState } from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import Sidebar from "../../components/AdminDashboard/SideBar";
import Topbar from "../../components/TopBar";

export default function AdminLayout() {
  const [open, setOpen] = useState(false);

  const { user, loading } = useSelector((state) => state.auth);

  // Wait until authentication is checked
  if (loading) {
    return <div>Loading...</div>;
  }

  // Only Admin users can access Admin pages
  if (!user || user.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  // Free HRMS demo: no subscription verification required
  return (
    <div className="flex h-[96vh] relative">
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
        />
      )}

      <Sidebar open={open} setOpen={setOpen} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar open={open} setOpen={setOpen} />

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
