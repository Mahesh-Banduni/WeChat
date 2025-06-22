"use client";

import { useState, useEffect, useRef } from 'react';
import { Users, MessageSquare, Send, ArrowLeft } from 'lucide-react';
import io from 'socket.io-client';
import api from '@/lib/api';
import useAuth from '@/hooks/useAuth';
import { format, isToday, isYesterday } from 'date-fns';

export default function ChatPage() {
  const { user } = useAuth();
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showChat, setShowChat] = useState(false); // Mobile view state
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initialize socket and load connections
  useEffect(() => {
    if (!user) return;

    const fetchConnectedUsers = async () => {
      try {
        const response = await api.get('/connection/all');
        setConnectedUsers(response.data.result || []);
      } catch (error) {
        console.error('Error fetching connections:', error);
      }
    };

    fetchConnectedUsers();

    // Connect to Socket.IO server on port 8080
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket'],
      auth: {
        token: user.token // Include auth token if needed
      }
    });

    socketRef.current.on('connect', () => {
      console.log('🟢 Connected to socket:', socketRef.current.id);
      // Join user's personal room
      socketRef.current.emit('join', { userId: user.userId });
    });

    socketRef.current.on('new_message', (msg) => {
      // Only add if relevant to current chat and not our own temp message
      if ((msg.senderId === selectedUser?.userId || msg.receiverId === selectedUser?.userId) &&
          msg.senderId !== user.userId) {
        setMessages(prev => {
          if (!prev.some(m => m.messageId === msg.messageId)) {
            return [...prev, msg].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          }
          return prev;
        });
      }
    });

    socketRef.current.on('message_delivered', (deliveredMsg) => {
      // Update temp message with final delivered message
      setMessages(prev => prev.map(m => 
        m.isTemp && m.senderId === user.userId ? deliveredMsg : m
      ));
    });

    socketRef.current.on('message_error', (error) => {
      console.error('Message delivery failed:', error);
      // Remove the temporary message if sending failed
      setMessages(prev => prev.filter(m => !m.isTemp || m.senderId !== user.userId));
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user, selectedUser]);

  // Load messages when user is selected
  useEffect(() => {
    if (selectedUser && user) {
      loadMessages();
    }
  }, [selectedUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      setMessages(response.data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSelectUser = (peerUser) => {
    setSelectedUser(peerUser);
    setShowChat(true); // Show chat on mobile
  };

  const handleBackToContacts = () => {
    setShowChat(false);
    setSelectedUser(null);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || isSending) return;

    const tempMessageId = `temp-${Date.now()}`;
    const tempMessage = {
      messageId: tempMessageId,
      senderId: user.userId,
      receiverId: selectedUser.userId,
      content: newMessage,
      createdAt: new Date().toISOString(),
      isTemp: true
    };

    setIsSending(true);
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    try {
      // Save to DB via API (port 8000)
      const response = await api.post('/message/send', {
        receiverId: selectedUser.userId,
        content: newMessage,
      });

      // The API server will forward to Socket.IO server
      // Just update our local state with the final message
      setMessages(prev => prev.map(m => 
        m.messageId === tempMessageId ? response.data : m
      ));

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.messageId !== tempMessageId));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

  if (!user) return null;

const groupMessagesByDate = (messages) => {
  const groups = {};

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
            {/* <div className="flex items-center space-x-1">
              <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
                {connectedUsers.length} online
              </span>
            </div> */}
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
          {connectedUsers.map((connection, index) => {
            const peerUser = connection.userA.userId !== user.userId
              ? connection.userA
              : connection.userB;
            return (
              <div
                key={peerUser.userId}
                className={`relative px-4 py-3 cursor-pointer transition-all duration-150 hover:bg-gray-50 active:bg-gray-100 ${
                  selectedUser?.userId === peerUser.userId 
                    ? 'bg-blue-50 border-r-3 border-blue-500' 
                    : ''
                }`}
                onClick={() => handleSelectUser(peerUser)}
              >
                <div className="flex items-start space-x-3">
                  {/* Profile Picture with Online Status */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-base shadow-sm">
                      {peerUser.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate text-base">
                        {peerUser.name}
                      </h3>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        12:30 PM
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate pr-2">
                        Click to start chatting...
                      </p>
                      {/* Unread badge - you can conditionally show this
                      {index === 0 && (
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-500 rounded-full">
                            2
                          </span>
                        </div>
                      )} */}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {connectedUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No contacts yet</h3>
            <p className="text-sm text-gray-500 text-center max-w-sm">
              Your conversations will appear here once you connect with other users.
            </p>
          </div>
        )}
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
              
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                {selectedUser.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 truncate">
                  {selectedUser.name}
                </h2>
                <div className="text-sm text-gray-500 truncate">
                  {selectedUser.email}
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
                  {connectedUsers.length} contacts available
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
                <div className="p-3 space-y-3">
                  {Object.entries(groupMessagesByDate(messages)).map(([dateLabel, msgs]) => (
                    <div key={dateLabel}>
                      {/* Date Separator */}
                      <div className="flex justify-center my-4">
                        <span className="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full">
                          {dateLabel}
                        </span>
                      </div>

                      {/* Messages under this date */}
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
                              }`}
                            >
                              <div className="text-sm leading-relaxed">{msg.content}</div>
                              <div
                                className={`text-xs mt-1 ${
                                  msg.senderId === user.userId ? 'text-blue-100' : 'text-gray-500'
                                }`}
                              >
                                <span className="text-[75%]">{formatDate(msg.createdAt)}</span>
                                {msg.isTemp && <span className="ml-1 text-[75%] opacity-70">(Sending...)</span>}
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
                <Send className="w-5 h-5" />
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