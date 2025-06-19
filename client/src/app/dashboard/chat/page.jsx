"use client";

import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import api from '@/lib/api';
import useAuth from '@/hooks/useAuth';

let socket;

export default function ChatPage() {
  const { user } = useAuth();
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const socketRef = useRef(null);

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

    // Initialize socket connection
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000', {
      query: { userId: user.userId },
    });

    socketRef.current.on('connect', () => {
      console.log('🟢 Connected to socket:', socketRef.current.id);
    });

    socketRef.current.on('receive-message', (msg) => {
      if (msg.sender === selectedUser?.userId || msg.receiver === selectedUser?.userId) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user, selectedUser]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    const message = {
      sender: user.userId,
      receiver: selectedUser.userId,
      content: newMessage,
      timestamp: new Date().toISOString(),
    };

    try {
      // Save to DB via API
      await api.post('/message/send', {
        senderId: user.userId,
        receiverId: selectedUser.userId,
        content: newMessage,
      });

      // Emit real-time message via socket
      socketRef.current.emit('send-message', message);

      // Update UI instantly
      setMessages((prev) => [...prev, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-full">
      {/* Connected Users */}
      <div className="w-1/4 bg-white border-r border-gray-200 p-4">
        <h2 className="text-md font-semibold mb-4">Connected Users</h2>
        <ul className="space-y-2">
          {connectedUsers.map((connection) => {
            const peerUser = connection.userA.userId !== user.userId
              ? connection.userA
              : connection.userB;
            return (
              <li
                key={peerUser.userId}
                className={`p-2 rounded cursor-pointer ${
                  selectedUser?.userId === peerUser.userId
                    ? 'bg-blue-100'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => {
                  setSelectedUser(peerUser);
                  setMessages([]); // Clear or load chat history here
                }}
              >
                {peerUser.name}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Chat Section */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold">
            {selectedUser ? `Chat with ${selectedUser.name}` : 'Select a user to chat'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {selectedUser ? (
            messages.length > 0 ? (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-4 ${msg.sender === user.userId ? 'text-right' : 'text-left'}`}
                >
                  <div
                    className={`inline-block p-3 rounded-lg ${
                      msg.sender === user.userId
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 mt-8">
                No messages yet. Start the conversation!
              </div>
            )
          ) : (
            <div className="text-center text-gray-500 mt-8">
              Select a user from the list to start chatting
            </div>
          )}
        </div>

        {selectedUser && (
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 transition"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
