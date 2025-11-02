"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Menu, Bell, Check, X, Settings, LogOut, User, ChevronDown } from 'lucide-react';
import useAuth from '@/hooks/useAuth';
import api from '@/lib/api';
import { errorToast, successToast } from '../ui/toast';
import { timeAgo } from '@/lib/timeAgo';
import { useRouter } from 'next/navigation';
import { handleInvite } from '../../app/dashboard/invites/page.jsx';
import { useSocket } from '@/providers/socket-provider';
import { motion, AnimatePresence } from 'framer-motion';
import {initForegroundNotificationListener } from '@/utils/firebase.js';

export default function Header({ user, onMenuClick }) {
  const router = useRouter();
  const { logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inviteDetails, setInviteDetails] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [processingInvites, setProcessingInvites] = useState(new Set());
  const socket = useSocket();

  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);
  const lastClickTime = useRef(0);

  // Fixed fetchInviteDetails - removed inviteDetails from dependencies
  const fetchInviteDetails = useCallback(async (inviteId, forceRefresh = false) => {
    try {
      const response = await api.get(`/connection/invite/${inviteId}`);
      if (response?.status === 200) {
        const inviteData = response.data.invite;
        setInviteDetails(prev => {
          // Only update if forceRefresh or if we don't have this data
          if (forceRefresh || !prev[inviteId]) {
            return {
              ...prev,
              [inviteId]: inviteData
            };
          }
          return prev;
        });
        console.log('Fetched invite details:', inviteData);
        return inviteData;
      }
    } catch (error) {
      console.error('Error fetching invite details:', error);
    }
    return null;
  }, []); // Empty dependencies to prevent infinite loops

  // Fixed fetchAllInviteDetails - removed fetchInviteDetails from dependencies
  const fetchAllInviteDetails = useCallback(async (notifications) => {
    const inviteNotifications = notifications.filter(notif => notif.type === 'INVITE' && notif.inviteId);
    
    if (inviteNotifications.length === 0) return;

    try {
      // Fetch all invite details in parallel
      const invitePromises = inviteNotifications.map(async (notif) => {
        try {
          const response = await api.get(`/connection/invite/${notif.inviteId}`);
          if (response?.status === 200) {
            const inviteData = response.data.invite;
            setInviteDetails(prev => ({
              ...prev,
              [notif.inviteId]: inviteData
            }));
            return inviteData;
          }
        } catch (error) {
          console.error(`Error fetching invite ${notif.inviteId}:`, error);
        }
        return null;
      });
      
      await Promise.all(invitePromises);
    } catch (error) {
      console.error('Error fetching all invite details:', error);
    }
  }, []); // Empty dependencies

  // Fixed markNotificationsAsRead - removed notifications from dependencies
  const markNotificationsAsRead = useCallback(async () => {
    if (isMarkingRead || unreadCount === 0) return;
    
    setIsMarkingRead(true);
    try {
      await api.post('/notification/mark-all-read');
      
      // Only update after successful API call
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      errorToast('Failed to mark notifications as read');
    } finally {
      setIsMarkingRead(false);
    }
  }, [isMarkingRead, unreadCount]); // Only necessary dependencies

  // Enhanced function to recalculate unread count
  const recalculateUnreadCount = useCallback(() => {
    setNotifications(prev => {
      const newUnreadCount = prev.filter(n => !n.isRead).length;
      setUnreadCount(newUnreadCount);
      return prev;
    });
  }, []);

  // Fixed toggleNotifications
  const toggleNotifications = useCallback(async () => {
    const now = Date.now();
    // Debounce rapid clicks
    if (now - lastClickTime.current < 300) return;
    lastClickTime.current = now;

    setIsNotificationOpen(prev => {
      const newState = !prev;
      if (newState) {
        markNotificationsAsRead();
        // Use setTimeout to avoid blocking the UI
        setTimeout(() => {
          setNotifications(currentNotifications => {
            fetchAllInviteDetails(currentNotifications);
            return currentNotifications;
          });
        }, 0);
      }
      return newState;
    });
  }, [markNotificationsAsRead, fetchAllInviteDetails]);

  // Fixed fetchNotifications - removed fetchAllInviteDetails from dependencies
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/notification/all');
      const notificationsWithTimeAgo = (response.data.notifications || []).map(notif => ({
        ...notif,
        timeAgo: timeAgo(notif.createdAt),
      }));

      setNotifications(notificationsWithTimeAgo);
      setUnreadCount(notificationsWithTimeAgo.filter(n => !n.isRead).length);
      
      // Fetch invite details separately to avoid infinite loops
      if (notificationsWithTimeAgo.length > 0) {
        setTimeout(() => {
          fetchAllInviteDetails(notificationsWithTimeAgo);
        }, 0);
      }
    } catch (error) {
      errorToast(error.response?.data?.error || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [fetchAllInviteDetails]);

  // Fixed handleNewNotification - removed fetchInviteDetails from dependencies
  const handleNewNotification = useCallback((notification) => {
    setNotifications(prev => {
      // Prevent duplicates
      if (prev.some(n => n.notificationId === notification.notificationId)) {
        return prev;
      }

      const newNotification = {
        ...notification,
        timeAgo: timeAgo(notification.createdAt)
      };
      successToast(newNotification.message);

      return [newNotification, ...prev.slice(0, 49)]; // Keep max 50
    });

    // Update unread count separately to avoid double counting
    if (!notification.isRead) {
      setUnreadCount(count => count + 1);
    }

    // Fetch invite details separately
    if (notification.type === "INVITE" && notification.inviteId) {
      setTimeout(() => {
        fetchInviteDetails(notification.inviteId, true);
      }, 0);
    }
  }, []); // Empty dependencies

  // Handle invite status updates via socket
  // const handleInviteStatusUpdate = useCallback((data) => {
  //   const { inviteId, status, updatedBy } = data;
    
  //   // Update invite details in state
  //   setInviteDetails(prev => ({
  //     ...prev,
  //     [inviteId]: {
  //       ...prev[inviteId],
  //       status: status
  //     }
  //   }));

  //   // Show toast notification for status change
  //   if (updatedBy !== user?.userId) {
  //     const statusMessage = status === 'ACCEPTED' ? 'accepted' : 'rejected';
  //     successToast(`Invite ${statusMessage}`);
  //   }
  // }, [user?.userId]);

  // Fixed handleInviteAction - removed fetchInviteDetails from dependencies
  const handleInviteAction = useCallback(async (inviteId, action, event) => {
    event.stopPropagation();
    
    if (processingInvites.has(inviteId)) return;
    
    setProcessingInvites(prev => new Set(prev).add(inviteId));
    
    // Optimistic update
    const newStatus = action.status;
    setInviteDetails(prev => ({
      ...prev,
      [inviteId]: {
        ...prev[inviteId],
        status: newStatus
      }
    }));

    try {
      //const result = await handleInvite(inviteId, action);
      // if (result.success) {
      //   successToast(`Invite ${newStatus.toLowerCase()}`);
        // Refresh invite details from server to ensure consistency
      if(handleInvite && action){
        await handleInvite(inviteId, action);
        setTimeout(() => {
          fetchInviteDetails(inviteId, true);
        }, 0);
      } else {
        throw new Error(result.error || 'Failed to process invite');
      }
    } catch (error) {
      console.error('Error handling invite:', error);
      errorToast(error.message || 'Failed to process invite');
      
      // Revert optimistic update on error
      setTimeout(() => {
        fetchInviteDetails(inviteId, true);
      }, 0);
    } finally {
      setProcessingInvites(prev => {
        const newSet = new Set(prev);
        newSet.delete(inviteId);
        return newSet;
      });
    }
  }, [processingInvites]); // Only necessary dependencies

  // Initial data fetch - run only once
  useEffect(() => {
    fetchNotifications();
  }, []); // Empty dependencies to run only once

  // Socket setup with invite status updates
  useEffect(() => {
    if (!socket) return;

    initForegroundNotificationListener((payload) => {
      console.log("📬 Foreground payload in component:", payload.data);
      handleNewNotification(payload.data);
    });

    //socket.on('new_notification', handleNewNotification);
    //socket.on('invite_status_updated', handleInviteStatusUpdate);
    
    return () => {
      //socket.off('new_notification', handleNewNotification);
      //socket.off('invite_status_updated', handleInviteStatusUpdate);
    };
  }, [socket, handleNewNotification]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = useCallback((notif) => {
    if (notif.type === 'INVITE') {
      router.push('/dashboard/invites');
    } else if (notif.type === 'CONNECTION') {
      router.push('/dashboard/chat');
    }
    setIsNotificationOpen(false);
  }, [router]);

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
  };

  // Helper function to render invite status
  const renderInviteStatus = useCallback((notif) => {
    const invite = inviteDetails[notif.inviteId];
    if (!invite) return null;

    const isReceiver = invite.receiver?.userId === user?.userId;
    const isPending = invite.status === "PENDING";
    const isAccepted = invite.status === "ACCEPTED";
    const isRejected = invite.status === "REJECTED";
    const isProcessing = processingInvites.has(notif.inviteId);

    // Only show controls to the receiver
    if (!isReceiver) return null;

    if (isPending) {
      return (
        <div className="flex space-x-2 mt-2">
          <button
            onClick={(e) => handleInviteAction(notif.inviteId, { status: 'ACCEPTED' }, e)}
            disabled={isProcessing}
            className="flex items-center space-x-1 bg-green-50 px-2 py-1 text-xs border border-green-200 rounded-full hover:bg-green-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <div className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-3 h-3 text-green-600" />
            )}
            <span className="text-green-700">Accept</span>
          </button>
          <button
            onClick={(e) => handleInviteAction(notif.inviteId, { status: 'REJECTED' }, e)}
            disabled={isProcessing}
            className="flex items-center space-x-1 bg-red-50 px-2 py-1 text-xs border border-red-200 rounded-full hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <X className="w-3 h-3 text-red-600" />
            )}
            <span className="text-red-700">Reject</span>
          </button>
        </div>
      );
    } else if (isAccepted) {
      return (
        <div className="inline-flex items-center px-2 py-1 text-xs text-green-600 bg-green-50 rounded-full mt-2">
          <Check className="w-3 h-3 mr-1" />
          Accepted
        </div>
      );
    } else if (isRejected) {
      return (
        <div className="inline-flex items-center px-2 py-1 text-xs text-red-600 bg-red-50 rounded-full mt-2">
          <X className="w-3 h-3 mr-1" />
          Rejected
        </div>
      );
    }

    return null;
  }, [inviteDetails, user?.userId, processingInvites, handleInviteAction]);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div className="flex justify-between items-center px-4 lg:px-6 py-3 lg:py-4">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">WC</span>
            </div>
            <div className="block">
              <h1 className="text-xl font-bold text-gray-900">WeChat</h1>
              <p className="text-xs text-gray-500 hidden lg:block">Talk. Connect. Built for Conversations That Matter.</p>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 lg:space-x-4">
          
          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(prev => !prev)}
              className="flex items-center space-x-2 lg:space-x-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="User menu"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden lg:block text-left">
                <div className="font-medium text-gray-900 text-sm">{user?.name}</div>
                <div className="text-xs text-gray-500 truncate max-w-32">{user?.email}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500 hidden lg:block" />
            </button>

            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                >
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{user?.name}</div>
                        <div className="text-sm text-gray-500 truncate">{user?.email}</div>
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 text-gray-700">
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </button>
                    <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 text-gray-700">
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                  </div>

                  <div className="border-t border-gray-200 py-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center space-x-3 text-red-600"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={toggleNotifications}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
              aria-label="Notifications"
              disabled={isMarkingRead}
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <motion.span 
                  key={`unread-${unreadCount}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
              {isMarkingRead && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                </div>
              )}
            </button>
            
            <AnimatePresence>
              {isNotificationOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                >
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && !isMarkingRead && (
                      <button 
                        onClick={markNotificationsAsRead}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                
                  <div className="overflow-y-auto divide-y divide-gray-100 max-h-[60vh] sm:max-h-[70vh] md:max-h-[75vh] lg:max-h-[80vh] xl:max-h-[85vh] 2xl:max-h-[90vh]">
                    {isLoading ? (
                      <div className="p-4 flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      </div>
                    ) : notifications.length > 0 ? (
                      notifications.slice(0, 5).map((notif) => (
                        <motion.div
                          key={notif.notificationId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          onClick={() => handleNotificationClick(notif)}
                          className={`w-full text-left p-3 hover:bg-gray-50 cursor-pointer ${
                            notif.isRead ? 'bg-white' : 'bg-blue-50'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                        
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 break-words">{notif.message}</p>
                              <p className="text-xs text-gray-500 mt-1">{notif.timeAgo}</p>
                              
                              {notif.type === 'INVITE' && notif.inviteId && renderInviteStatus(notif)}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-gray-500 text-center">No notifications yet.</div>
                    )}
                  </div>
                  
                  {/* {notifications.length > 5 && (
                    <div className="p-3 border-t border-gray-200 text-center">
                      <a
                        href="/notifications"
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View all notifications
                      </a>
                    </div>
                  )} */}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}