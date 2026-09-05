import { useState } from "react";
import { Outlet } from "react-router";
import { EmployeeSidebar } from "./EmployeeSidebar";
import { TopBar } from "./TopBar";

export function EmployeeLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <EmployeeSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}