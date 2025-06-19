// src/components/layout/Sidebar.jsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path) => {
    return pathname.includes(path);
  };

  return (
    <div className="w-64 bg-gray-800 text-white">
      <div className="p-4">
        <h2 className="text-xl font-semibold">Menu</h2>
      </div>
      <nav className="mt-6">
        <Link
          href="/dashboard/chat"
          className={`flex items-center px-6 py-3 ${isActive('/chat') ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
        >
          <span>Chat</span>
        </Link>
        <Link
          href="/dashboard/invites"
          className={`flex items-center px-6 py-3 ${isActive('/invites') ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
        >
          <span>Invites</span>
        </Link>
      </nav>
    </div>
  );
}