// hooks/useChat.js - Custom hook for chat logic
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useSocket } from '@/providers/socket-provider';
import { requestFCMPermission } from '@/utils/firebase.js';

export default function useChat(user) {
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
const handleNewMessage = (msgs) => {
  if (!Array.isArray(msgs)) {
    msgs = [msgs]; // fallback: if a single message was passed accidentally
  }

  console.log('Received new messages:', msgs);

  // Filter messages for current selected chat
  const relevantMsgs = msgs.filter(msg =>
    selectedUser &&
    (
      (msg.senderId === selectedUser.userId && msg.receiverId === user.userId) ||
      (msg.senderId === user.userId && msg.receiverId === selectedUser.userId)
    )
  );

  // Add new messages to chat (if not already there)
  if (relevantMsgs.length > 0) {
    setMessages(prev => {
      const existingIds = new Set(prev.map(m => m.messageId));
      const newMessages = relevantMsgs.filter(msg => !existingIds.has(msg.messageId));
      const updated = [...prev, ...newMessages];
      return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });
  }

  // Update latest messages
  setLatestMessages(prev => {
    const updated = [...prev];

    msgs.forEach(msg => {
      const otherUserId = msg.senderId === user.userId ? msg.receiverId : msg.senderId;
      const existingIndex = updated.findIndex(m => m.user.userId === otherUserId);

      if (existingIndex >= 0) {
        const [movedItem] = updated.splice(existingIndex, 1);

        const unreadCount = msg.receiverId === user.userId && selectedUser?.userId !== msg.senderId
          ? (movedItem.unreadCount || 0) + 1
          : selectedUser?.userId === otherUserId ? 0 : movedItem.unreadCount || 0;

        updated.unshift({
          ...movedItem,
          latestMessage: msg,
          unreadCount
        });
      }
    });

    return updated;
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

  // Load messages when user is selected
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

  // Handle send message
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
        console.log("socket shoutout",response);
        socket.emit('message_sent', {
          messageId: response.data.messageId,
          receiverId: selectedUser.userId,
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

  // Handle file message (same logic as send message)
const handleFileMessage = async (files) => {
  if (!selectedUser || !files || files.length === 0 || isSending) return;

  setIsSending(true);

  const tempMessages = files.map((file, index) => {
    const fileType = file.type.startsWith('image/')
      ? 'IMAGE'
      : file.type.startsWith('video/')
      ? 'VIDEO'
      : file.type !== undefined || null
      ? 'FILE'
      : 'TEXT';

    return {
      messageId: `temp-${Date.now()}-${index}`,
      senderId: user.userId,
      receiverId: selectedUser.userId,
      content: '',
      fileType,
      fileName: file.name,
      createdAt: new Date().toISOString(),
      status: 'SENDING',
      isTemp: true,
    };
  });

  // Show temp messages in UI
  setMessages((prev) => {
    const updated = [...prev, ...tempMessages];
    return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  });

  // Prepare FormData
  const formData = new FormData();
  files.forEach((file) => {
    const fileType = file.type.startsWith('image/')
      ? 'IMAGE'
      : file.type.startsWith('video/')
      ? 'VIDEO'
      : 'FILE';

    if (fileType === 'IMAGE') formData.append('images', file);
    else if (fileType === 'VIDEO') formData.append('video', file);
    else formData.append('documents', file);
  });

  // Shared fields
  formData.append('receiverId', selectedUser.userId);
  // Assume all files are same type, or pick first one for the request
  formData.append('messageType', tempMessages[0].fileType);

  try {
    const response = await api.post('/message/send', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const realMessages = response.data; // expecting an array of messages
    if (!Array.isArray(realMessages)) throw new Error('Unexpected response');

    setMessages((prev) => {
      const filtered = prev.filter((m) => !m.isTemp);
      const updated = [...filtered, ...realMessages.map(m => ({ ...m, status: 'SENT' }))];
      return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });

    setLatestMessages((prev) => {
      const latest = realMessages[realMessages.length - 1];
      const updated = prev.map((item) =>
        item.user.userId === selectedUser.userId
          ? {
              ...item,
              latestMessage: latest,
              unreadCount: 0,
            }
          : item
      );

      const index = updated.findIndex((item) => item.user.userId === selectedUser.userId);
      if (index > 0) {
        const [movedItem] = updated.splice(index, 1);
        updated.unshift(movedItem);
      }

      return updated;
    });

    if (socket) {
      console.log("socket shoutout 2", realMessages);
      for (const message of realMessages) {
        socket.emit('message_sent', {
          messageId: message.messageId,
          receiverId: selectedUser.userId,
        });
      }
    }
  } catch (error) {
    console.error('Error sending file messages:', error);
    setMessages((prev) => prev.filter((m) => !m.isTemp));
  } finally {
    setIsSending(false);
  }
};

const handleSendMessageAndFiles = async (files = []) => {
  if ((!newMessage.trim() && (!files || files.length === 0)) || !selectedUser || isSending) return;

  setIsSending(true);

  const messageText = newMessage.trim();
  setNewMessage('');

  const tempMessages = [];

  if (files && files.length > 0) {
    files.forEach((file, index) => {
      const fileType = file.type.startsWith('image/')
        ? 'IMAGE'
        : file.type.startsWith('video/')
        ? 'VIDEO'
        : file.type
        ? 'FILE'
        : 'TEXT';

      tempMessages.push({
        messageId: `temp-${Date.now()}-${index}`,
        senderId: user.userId,
        receiverId: selectedUser.userId,
        content: '',
        fileType,
        fileName: file.name,
        createdAt: new Date().toISOString(),
        status: 'SENDING',
        isTemp: true,
      });
    });
  }

  if (messageText) {
    tempMessages.push({
      messageId: `temp-${Date.now()}`,
      senderId: user.userId,
      receiverId: selectedUser.userId,
      content: messageText,
      createdAt: new Date().toISOString(),
      status: 'SENDING',
      isTemp: true,
    });
  }

  // Add temp messages to chat UI
  setMessages((prev) => {
    const updated = [...prev, ...tempMessages];
    return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  });

  try {
    let realMessages = [];

    if (files.length > 0) {
      // Send files (multipart)
      const formData = new FormData();
      files.forEach((file) => {
        const fileType = file.type.startsWith('image/')
          ? 'IMAGE'
          : file.type.startsWith('video/')
          ? 'VIDEO'
          : 'FILE';

        if (fileType === 'IMAGE') formData.append('images', file);
        else if (fileType === 'VIDEO') formData.append('video', file);
        else formData.append('documents', file);
      });

      formData.append('receiverId', selectedUser.userId);
      formData.append('messageType', tempMessages[0].fileType); // take type from first file
      if (messageText) formData.append('content', messageText);

      const fileResponse = await api.post('/message/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      realMessages = Array.isArray(fileResponse.data) ? fileResponse.data : [fileResponse.data];
    } else {
      // Send text only (JSON)
      const textResponse = await api.post('/message/send', {
        receiverId: selectedUser.userId,
        content: messageText,
      });

      realMessages = [textResponse.data];
    }

    setMessages((prev) => {
      const filtered = prev.filter((m) => !m.isTemp);
      const updated = [...filtered, ...realMessages.map((m) => ({ ...m, status: 'SENT' }))];
      return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });

    setLatestMessages((prev) => {
      const latest = realMessages[realMessages.length - 1];
      const updated = prev.map((item) =>
        item.user.userId === selectedUser.userId
          ? {
              ...item,
              latestMessage: latest,
              unreadCount: 0,
            }
          : item
      );

      const index = updated.findIndex((item) => item.user.userId === selectedUser.userId);
      if (index > 0) {
        const [movedItem] = updated.splice(index, 1);
        updated.unshift(movedItem);
      }

      return updated;
    });

    if (socket) {

      realMessages.flat().forEach(message => {
        socket.emit('message_sent', {
          messageId: message.messageId,
          receiverId: selectedUser.userId,
        });
      });

    }
  } catch (error) {
    console.error('Error sending message:', error);
    // Remove temp messages on failure
    setMessages((prev) => prev.filter((m) => !m.isTemp));
  } finally {
    setIsSending(false);
  }
};

  // Handle select user
  const handleSelectUser = async (userData) => {
    setSelectedUser(userData.user);
    setShowChat(true);
    // loadMessages will be called by useEffect
  };

  // Handle back to contacts
  const handleBackToContacts = () => {
    setShowChat(false);
    setSelectedUser(null);
    setMessages([]);
  };

  // Initialize FCM when user is ready
  useEffect(() => {
    if (!user) return;
    requestFCMPermission(); // Only runs when user is ready
  }, [user]);

  // Main socket setup and message fetching
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

  return {
    // State
    isLoadingContacts,
    latestMessages,
    messages,
    newMessage,
    selectedUser,
    isLoadingMessages,
    isSending,
    showChat,
    typingUsers,
    onlineStatus,
    messagesEndRef,

    // Actions
    setNewMessage,
    handleSelectUser,
    handleBackToContacts,
    handleSendMessage,
    handleFileMessage,
    handleSendMessageAndFiles
  };
}