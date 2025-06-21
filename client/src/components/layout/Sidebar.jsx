// src/components/layout/Sidebar.jsx
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  MessageSquare, 
  Mail, 
  Users, 
  Settings, 
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Home,
  UserPlus,
  LogOut
} from 'lucide-react';
import useAuth from '@/hooks/useAuth';

export default function Sidebar({ isOpen, onClose }) {
  const { logout } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    if (onClose) {
      onClose();
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const menuItems = [
    {
      label: 'Dashboard',
      icon: Home,
      href: '/dashboard',
      exact: true
    },
    {
      label: 'Contacts',
      icon: Users,
      href: '/dashboard/chat',
      badge: '3'
    },
    {
      label: 'Invites',
      icon: UserPlus,
      href: '/dashboard/invites',
      badge: '2'
    },
  ];

  const bottomMenuItems = [
    {
      label: 'Settings',
      icon: Settings,
      href: '/dashboard/settings'
    },
    {
      label: 'Help & Support',
      icon: HelpCircle,
      href: '/dashboard/help'
    }
  ];

  const isActive = (item) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      <div className={`
        fixed lg:relative z-50 h-full bg-white border-r border-gray-200 flex flex-col
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'w-16' : 'w-64 lg:w-72'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Navigation</h2>
                <p className="text-xs text-gray-500">Quick access menu</p>
              </div>
            </div>
          )}
          
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`
                    group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                    ${active 
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                    ${isCollapsed ? 'justify-center' : 'justify-between'}
                  `}
                >
                  <div className="flex items-center">
                    <Icon className={`
                      flex-shrink-0 transition-colors duration-200
                      ${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
                      ${isCollapsed ? 'w-5 h-5' : 'w-5 h-5 mr-3'}
                    `} />
                    {!isCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </div>
                  
                  {!isCollapsed && item.badge && (
                    <span className={`
                      inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full
                      ${active 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800 group-hover:bg-gray-200'
                      }
                    `}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-6 px-3">
            <div className="border-t border-gray-200"></div>
          </div>

          {/* Bottom Navigation */}
          <div className="px-3 space-y-1">
            {bottomMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`
                    group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                    ${active 
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                >
                  <Icon className={`
                    flex-shrink-0 transition-colors duration-200
                    ${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
                    ${isCollapsed ? 'w-5 h-5' : 'w-5 h-5 mr-3'}
                  `} />
                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              );
            })}

            {/* Logout Button - Properly positioned and styled */}
            <div className="pt-2 mt-2 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className={`
                  group w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                  text-red-600 hover:bg-red-50 hover:text-red-700
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                <LogOut className={`
                  flex-shrink-0 transition-colors duration-200
                  text-red-500 group-hover:text-red-600
                  ${isCollapsed ? 'w-5 h-5' : 'w-5 h-5 mr-3'}
                `} />
                {!isCollapsed && (
                  <span className="truncate">Sign out</span>
                )}
              </button>
            </div>
          </div>
        </nav>

        {/* Sidebar Footer */}
        {!isCollapsed && (
          <div className="p-4 border-t border-gray-200 mt-auto">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">WeChat Pro</p>
                  <p className="text-xs text-gray-500">Professional Edition</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tooltip for collapsed items */}
        {isCollapsed && (
          <div className="hidden lg:block absolute left-full top-0 h-full pointer-events-none">
            {/* Tooltips would be rendered here for collapsed state */}
          </div>
        )}
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
}