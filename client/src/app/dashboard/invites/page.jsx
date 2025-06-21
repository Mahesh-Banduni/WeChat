"use client";

import { useState, useEffect } from 'react';
import { UserPlus, Mail, User, Check, Clock, Send } from 'lucide-react';
import api from '@/lib/api';
import useAuth from '@/hooks/useAuth';

export default function InvitesPage() {
  const { user } = useAuth();
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const response = await api.get('/connection/invites');
      setInvites(response.data.result || []);
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchInvites();
    }
  }, [user]);

  const handleSendInvite = async () => {
    if (!email.trim()) return;

    try {
      await api.post('/connection/send-invite', { email });
      setEmail('');
      await fetchInvites();
    } catch (error) {
      console.error('Error sending invite:', error);
    }
  };

  const handleAcceptInvite = async (inviteId) => {
    try {
      await api.post(`/connection/accept-invite/${inviteId}`);
      await fetchInvites();
    } catch (error) {
      console.error('Error accepting invite:', error);
    }
  };

  const receivedInvites = invites.filter(invite => invite.receiver?.userId === user?.userId);
  const sentInvites = invites.filter(invite => invite.sender?.userId === user?.userId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Invite Management</h2>
            <p className="text-sm text-gray-500">Connect with other users</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Send Invite Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Mail className="w-5 h-5 text-blue-500" />
            <h3 className="font-medium text-gray-800">Send New Invite</h3>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendInvite();
                }}
              />
            </div>
            <button
              onClick={handleSendInvite}
              disabled={!email.trim()}
              className={`p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center ${
                email.trim()
                  ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Received Invites */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <User className="w-5 h-5 text-green-500" />
            <h3 className="font-medium text-gray-800">Received Invites</h3>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full ml-auto">
              {receivedInvites.length}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : receivedInvites.length > 0 ? (
            <div className="space-y-3">
              {receivedInvites.map((invite) => (
                <div key={invite.inviteId} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {invite.sender.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{invite.sender.name}</div>
                      <div className="text-sm text-gray-500">{invite.sender.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAcceptInvite(invite.inviteId)}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center space-x-1 transition"
                  >
                    <Check className="w-4 h-4" />
                    <span>Accept</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <Mail className="w-8 h-8 mx-auto mb-2" />
              <p>No pending invites</p>
            </div>
          )}
        </div>

        {/* Sent Invites */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-2 mb-4">
            <User className="w-5 h-5 text-orange-500" />
            <h3 className="font-medium text-gray-800">Sent Invites</h3>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full ml-auto">
              {sentInvites.length}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : sentInvites.length > 0 ? (
            <div className="space-y-3">
              {sentInvites.map((invite) => (
                <div key={invite.inviteId} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {invite.receiver.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{invite.receiver.name}</div>
                      <div className="text-sm text-gray-500">{invite.receiver.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      invite.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : invite.status === 'accepted'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {invite.status}
                    </span>
                    {invite.status === 'pending' && <Clock className="w-4 h-4 text-yellow-500" />}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <Mail className="w-8 h-8 mx-auto mb-2" />
              <p>No sent invites</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}