// src/components/layout/Header.jsx
"use client";

import useAuth from '@/hooks/useAuth';

export default function Header({ user }) {
  const { logout } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <div className="flex justify-between items-center px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Chat Application</h1>
        <div className="flex items-center space-x-4">
          <span className="text-gray-700">{user?.name}</span>
          <button
            onClick={logout}
            className="text-red-500 hover:text-red-700 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}