"use client";

import { useState, useEffect, useRef } from 'react';
import { Users, MessageSquare, Send, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { useSocket } from '@/providers/socket-provider';
import useAuth from '@/hooks/useAuth';
import { format, isToday, isYesterday } from 'date-fns';

export default function ChatPage() {
  const { user } = useAuth();
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [latestMessages, setLatestMessages] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineStatus, setOnlineStatus] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socket = useSocket();

  // Enhanced socket handler with proper message handling
  const handleNewMessage = (msg) => {
    console.log('Received new message:', msg);
    
    // For current chat - add to messages if it's for the selected conversation
    if (selectedUser && 
        ((msg.senderId === selectedUser.userId && msg.receiverId === user.userId) ||
         (msg.senderId === user.userId && msg.receiverId === selectedUser.userId))) {
      setMessages(prev => {
        // Check if message already exists
        if (!prev.some(m => m.messageId === msg.messageId)) {
          // Add new message and sort by createdAt (oldest first)
          const updated = [...prev, msg];
          return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        }
        return prev;
      });
    }
    
    // Update latest messages
    setLatestMessages(prev => {
      const otherUserId = msg.senderId === user.userId ? msg.receiverId : msg.senderId;
      const existingIndex = prev.findIndex(m => m.user.userId === otherUserId);
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        const [movedItem] = updated.splice(existingIndex, 1);
        
        // Update unread count only if message is received (not sent by current user)
        const unreadCount = msg.receiverId === user.userId && selectedUser?.userId !== msg.senderId
          ? (movedItem.unreadCount || 0) + 1 
          : selectedUser?.userId === otherUserId ? 0 : movedItem.unreadCount || 0;
        
        updated.unshift({
          ...movedItem,
          latestMessage: msg,
          unreadCount
        });
        return updated;
      }
      return prev;
    });
  };

  // Handle message status updates
  const handleMessageStatusUpdate = (data) => {
    console.log('Message status update:', data);
    
    // Update message status in current chat
    if (selectedUser) {
      setMessages(prev => prev.map(msg => 
        msg.messageId === data.messageId 
          ? { ...msg, status: data.status, readAt: data.readAt }
          : msg
      ));
    }
    
    // Update latest messages status
    setLatestMessages(prev => prev.map(item => {
      if (item.latestMessage?.messageId === data.messageId) {
        return {
          ...item,
          latestMessage: {
            ...item.latestMessage,
            status: data.status,
            readAt: data.readAt
          }
        };
      }
      return item;
    }));
  };

  // Handle when messages are marked as read
  const handleMessagesRead = (data) => {
    console.log('Messages marked as read:', data);
    
    // Update message status in current chat
    if (selectedUser && data.senderId === user.userId) {
      setMessages(prev => prev.map(msg => 
        msg.senderId === user.userId && msg.receiverId === data.receiverId
          ? { ...msg, status: 'READ', readAt: data.readAt }
          : msg
      ));
    }
  };

  // Handle typing indicators
  const handleUserTyping = (data) => {
    setTypingUsers(prev => ({
      ...prev,
      [data.userId]: data.typing
    }));

    // Auto-clear typing indicator after 3 seconds
    if (data.typing) {
      setTimeout(() => {
        setTypingUsers(prev => ({
          ...prev,
          [data.userId]: false
        }));
      }, 3000);
    }
  };

  // Handle user status updates (online/offline)
  const handleUserStatusUpdate = (data) => {
    console.log('User status update:', data);
    setOnlineStatus(prev => ({
      ...prev,
      [data.userId]: {
        status: data.status,
        lastSeen: data.lastSeen || new Date().toISOString()
      }
    }));

    // Also update the latestMessages to reflect status changes
    setLatestMessages(prev => prev.map(item => {
      if (item.user.userId === data.userId) {
        return {
          ...item,
          user: {
            ...item.user,
            status: data.status,
            lastSeen: data.lastSeen
          }
        };
      }
      return item;
    }));
  };

  // Handle initial online users list
  const handleOnlineUsers = (users) => {
    console.log('Initial online users:', users);
    const statusUpdates = {};
    
    users.forEach(user => {
      statusUpdates[user.userId] = {
        status: 'online',
        lastSeen: null
      };
    });
    
    setOnlineStatus(prev => ({
      ...prev,
      ...statusUpdates
    }));
    
    // Update latest messages with online status
    setLatestMessages(prev => prev.map(item => {
      if (users.some(u => u.userId === item.user.userId)) {
        return {
          ...item,
          user: {
            ...item.user,
            status: 'online',
            lastSeen: null
          }
        };
      }
      return item;
    }));
  };

  useEffect(() => {
    if (!user || !socket) return;

    const fetchLatestMessages = async () => {
      try {
        setIsLoadingContacts(true); 
        const response = await api.get('/message/latest');
        // Sort by latest message first
        const sorted = response.data.results?.sort((a, b) => 
          new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0)
        ) || [];
        setLatestMessages(sorted);
      } catch (error) {
        console.error('Error fetching latest messages:', error);
      }
      finally {
        setIsLoadingContacts(false); // Stop loading regardless of success/error
      }
    };

    fetchLatestMessages();

    // Join user's room
    socket.emit('join', { userId: user.userId });

    // Notify others that user is online when component mounts
    socket.emit('user_online', { 
      userId: user.userId,
      timestamp: new Date().toISOString()
    });

    // Request initial list of online users
    socket.emit('get_online_users');

    // Add visibility change listener to handle tab switching
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User came back to the page/tab
        socket.emit('user_online', { 
          userId: user.userId,
        });
        // Refresh online users list
        socket.emit('get_online_users');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Socket event listeners
    socket.on('new_message', handleNewMessage);
    socket.on('message_status_update', handleMessageStatusUpdate);
    socket.on('messages_read', handleMessagesRead);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_status_update', handleUserStatusUpdate);
    socket.on('online_users', handleOnlineUsers);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_status_update', handleMessageStatusUpdate);
      socket.off('messages_read', handleMessagesRead);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_status_update', handleUserStatusUpdate);
      socket.off('online_users', handleOnlineUsers);

      // Remove visibility change listener
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Notify others that user is going offline
      socket.emit('user_offline', { 
        userId: user.userId
      });
    };
  }, [user, socket, selectedUser]);

  // Load messages when user is selected
  useEffect(() => {
    if (selectedUser && user) {
      loadMessages();
    }
  }, [selectedUser]);

  // Auto-scroll with smooth behavior
  useEffect(() => {
    // Scroll to bottom when messages change
    const scrollToBottom = () => {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, selectedUser]);

  // Handle typing events
  useEffect(() => {
    if (!selectedUser || !socket) return;

    if (newMessage.trim()) {
      if (!isTyping) {
        setIsTyping(true);
        socket.emit('typing_start', {
          senderId: user.userId,
          receiverId: selectedUser.userId
        });
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socket.emit('typing_stop', {
          senderId: user.userId,
          receiverId: selectedUser.userId
        });
      }, 2000);
    } else {
      setIsTyping(false);
      socket.emit('typing_stop', {
        senderId: user.userId,
        receiverId: selectedUser.userId
      });
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [newMessage, selectedUser, socket, user]);

  const loadMessages = async () => {
    if (!selectedUser || !user) return;
    
    setIsLoadingMessages(true);
    try {
      const response = await api.get('/message/load', {
        params: {
          senderId: user.userId,
          receiverId: selectedUser.userId
        }
      });
      
      // Sort messages by createdAt (oldest first) for proper chronological order
      const sortedMessages = response.data?.sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      ) || [];
      
      setMessages(sortedMessages);
      
      // Mark messages as read
      await markMessagesAsRead(selectedUser.userId);
      
      // Scroll to bottom after messages are loaded
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Enhanced with real-time status update
  const markMessagesAsRead = async (senderId) => {
    try {
      await api.post('/message/mark-read', { senderId });

      // Update latest messages unread count
      setLatestMessages(prev => prev.map(item => {
        if (item.user.userId === senderId) {
          return { ...item, unreadCount: 0 };
        }
        return item;
      }));

      // Emit socket event for real-time status update
      if (socket) {
        socket.emit('mark_messages_read', {
          senderId: user.userId,
          receiverId: senderId
        });
      }

    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSelectUser = async (userData) => {
    setSelectedUser(userData.user);
    setShowChat(true);
    // loadMessages will be called by useEffect
  };

  const handleBackToContacts = () => {
    setShowChat(false);
    setSelectedUser(null);
    setMessages([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || isSending) return;

    const tempMessageId = `temp-${Date.now()}`;
    const tempMessage = {
      messageId: tempMessageId,
      senderId: user.userId,
      receiverId: selectedUser.userId,
      content: newMessage.trim(),
      createdAt: new Date().toISOString(),
      status: 'SENDING',
      isTemp: true
    };

    setIsSending(true);
    
    // Add temp message to chat (will be sorted properly)
    setMessages(prev => {
      const updated = [...prev, tempMessage];
      return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });
    
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const response = await api.post('/message/send', {
        receiverId: selectedUser.userId,
        content: messageContent,
      });

      // Replace temp message with actual message
      setMessages(prev => {
        const updated = prev.map(m => 
          m.messageId === tempMessageId ? { ...response.data, status: 'SENT' } : m
        );
        return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      });

      // Update latest messages
      setLatestMessages(prev => {
        const updated = prev.map(item => 
          item.user.userId === selectedUser.userId
            ? {
                ...item,
                latestMessage: { ...response.data, status: 'SENT' },
                unreadCount: 0
              }
            : item
        );
        
        // Move conversation to top
        const index = updated.findIndex(item => item.user.userId === selectedUser.userId);
        if (index > 0) {
          const [movedItem] = updated.splice(index, 1);
          updated.unshift(movedItem);
        }
        return updated;
      });

      // Emit socket event for real-time delivery
      if (socket) {
        socket.emit('message_sent', {
          messageId: response.data.messageId,
          receiverId: selectedUser.userId
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.messageId !== tempMessageId));
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      console.error('Invalid date:', dateString);
      return '';
    }
  };

  const getMessageStatusIcon = (message) => {
    if (message.senderId !== user.userId) return null;
    
    switch (message.status) {
      case 'SENDING':
        return <span className="text-[75%] opacity-50">⏳</span>;
      case 'SENT':
        return <span className="text-[75%]">✓</span>;
      case 'DELIVERED':
        return <span className="text-[75%]">✓✓</span>;
      case 'READ':
        return <span className="text-[75%] text-blue-200">✓✓</span>;
      default:
        return <span className="text-[75%]">✓</span>;
    }
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};

    // Messages are already sorted chronologically (oldest first)
    messages.forEach((msg) => {
      const date = new Date(msg.createdAt);
      let key;

      if (isToday(date)) {
        key = 'Today';
      } else if (isYesterday(date)) {
        key = 'Yesterday';
      } else {
        key = format(date, 'dd MMM yyyy');
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(msg);
    });

    return groups;
  };

  if (!user) return null;

  return (
    <div className="flex h-full">
      {/* Contacts Sidebar */}
      <div className={`
        w-full md:w-80 border-r border-gray-200 bg-white overflow-y-auto h-[calc(100vh-65px)]
        md:block md:fixed
        ${showChat ? 'hidden md:block' : 'block'}
      `}>
        {/* Header */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Chats</h1>
            <div className="flex items-center space-x-1">
              {/* <span className="text-xs text-gray-500">
                {Object.values(onlineStatus).filter(status => status.status === 'online').length} online
              </span>
              <span className="w-2 h-2 bg-green-500 rounded-full"></span> */}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-white border-b border-gray-100">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
          
        {/* Contacts List */}
        <div className="divide-y divide-gray-100">
          {isLoadingContacts ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : latestMessages.length > 0 ? (
            latestMessages.map((item) => (
              <div
                key={item.user.userId}
                className={`relative px-4 py-3 cursor-pointer transition-all duration-300 hover:bg-gray-50 active:bg-gray-100 ${
                  selectedUser?.userId === item.user.userId 
                    ? 'bg-blue-50 border-r-3 border-blue-500' 
                    : ''
                }`}
                onClick={() => handleSelectUser(item)}
              >
                <div className="flex items-start space-x-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-base shadow-sm">
                      {item.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-white rounded-full ${
                      onlineStatus[item.user.userId]?.status === 'online' 
                        ? 'bg-green-400' 
                        : 'bg-gray-400'
                    }`}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate text-base">
                        {item.user.name}
                      </h3>
                      {item.latestMessage?.createdAt && (
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatDate(item.latestMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <p className="text-sm text-gray-600 truncate">
                          {typingUsers[item.user.userId] 
                            ? 'typing...' 
                            : item.latestMessage?.content || 'Click to start chatting...'}
                        </p>
                        {item.latestMessage?.senderId === user.userId && (
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {getMessageStatusIcon(item.latestMessage)}
                          </span>
                        )}
                      </div>
                      {item.unreadCount > 0 && (
                        <div className="flex-shrink-0 ml-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-500 rounded-full">
                            {item.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {onlineStatus[item.user.userId]?.status === 'online' 
                        ? 'Online' 
                        : `Last seen recently`}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">No conversations yet</h3>
              <p className="text-sm text-gray-500 text-center max-w-sm">
                Your conversations will appear here once you start messaging.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`
        flex-1 flex flex-col h-[calc(100vh-65px)]
        md:ml-80
        ${showChat ? 'block' : 'hidden md:flex'}
      `}>
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
          {selectedUser ? (
            <div className="flex items-center space-x-4">
              {/* Back button for mobile */}
              <button
                onClick={handleBackToContacts}
                className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                  {selectedUser.name.charAt(0)}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full ${
                  onlineStatus[selectedUser.userId]?.status === 'online' 
                    ? 'bg-green-400' 
                    : 'bg-gray-400'
                }`}></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">
                    {selectedUser.name}
                  </h2>
                  {typingUsers[selectedUser.userId] && (
                    <span className="ml-2 text-xs text-gray-500">is typing...</span>
                  )}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {onlineStatus[selectedUser.userId]?.status === 'online' 
                    ? 'Online' 
                    : `Last seen recently`}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
                <p className="text-sm text-gray-500">
                  {latestMessages.length} contacts available 
                  {/* • {Object.values(onlineStatus).filter(status => status.status === 'online').length} online */}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {selectedUser ? (
            <>
              {isLoadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : messages.length > 0 ? (
                <div className="p-3 flex flex-col">
                  {Object.entries(groupMessagesByDate(messages)).map(([dateLabel, msgs]) => (
                    <div key={dateLabel}>
                      {/* Date Separator */}
                      <div className="flex justify-center my-4">
                        <span className="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full">
                          {dateLabel}
                        </span>
                      </div>

                      {/* Messages - maintain chronological order */}
                      {msgs.map((msg) => (
                        <div
                          key={msg.messageId}
                          className={`mt-1 flex ${msg.senderId === user.userId ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`flex items-end space-x-2 max-w-xs sm:max-w-md lg:max-w-lg ${
                              msg.senderId === user.userId ? 'flex-row-reverse space-x-reverse' : ''
                            }`}
                          >
                            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-medium text-xs">
                              {msg.senderId === user.userId ? user.name.charAt(0) : selectedUser.name.charAt(0)}
                            </div>
                            <div
                              className={`px-4 py-3 rounded-2xl shadow-sm ${
                                msg.senderId === user.userId
                                  ? 'bg-blue-500 text-white rounded-br-md'
                                  : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
                              } ${msg.isTemp ? 'opacity-70' : ''}`}
                            >
                              <div className="text-sm leading-relaxed">{msg.content}</div>
                              <div className={`text-xs mt-1 flex items-center space-x-1 ${
                                msg.senderId === user.userId ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                <span className="text-[75%]">{formatDate(msg.createdAt)}</span>
                                {msg.senderId === user.userId && (
                                  <span className="ml-1">
                                    {getMessageStatusIcon(msg)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No messages yet</h3>
                  <p className="text-sm text-center max-w-sm">
                    Start a conversation with {selectedUser.name} by sending a message below.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-700 mb-2">Welcome to Chat</h3>
              <p className="text-gray-500 mb-4 text-center">
                Select a contact from the sidebar to start chatting
              </p>
              <div className="text-sm text-gray-400">
                {Object.values(onlineStatus).filter(status => status.status === 'online').length} contacts online
              </div>
            </div>
          )}
        </div>
      
        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-4 sticky bottom-0">
          {selectedUser ? (
            <div className="flex items-center space-x-3 justify-center">
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  rows="1"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                  disabled={isSending}
                />
              </div>
              <div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
                    newMessage.trim() && !isSending
                      ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl active:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isSending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-2">
              Select a contact to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
}