// path: renderer/src/App.tsx
import React from "react";
import { Link, Outlet } from "@tanstack/react-router";

export default function App() {
  return (
    <div className="h-screen w-screen flex text-gray-900">
      <aside className="w-56 border-r p-3 space-y-2 bg-gray-50">
        <h1 className="text-lg font-semibold">Cheque Studio</h1>
        <nav className="flex flex-col gap-1">
          <Link to="/" className="hover:bg-gray-200 rounded px-2 py-1">
            Templates
          </Link>
          <Link to="/cheques" className="hover:bg-gray-200 rounded px-2 py-1">
            Cheques
          </Link>
          {/* <Link to="/print" className="hover:bg-gray-200 rounded px-2 py-1">Print</Link>
          <Link to="/settings" className="hover:bg-gray-200 rounded px-2 py-1">Settings</Link> */}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
