"use client";

import { useState, useEffect } from 'react';
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Invite Management</h1>

      {/* Send Invite */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Send Invite</h2>
        <div className="flex">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email to invite"
            className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSendInvite}
            className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 transition"
          >
            Send
          </button>
        </div>
      </div>

      {/* Received Invites */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Received Invites</h2>
        {loading ? (
          <p className="text-gray-500">Loading invites...</p>
        ) : receivedInvites.length > 0 ? (
          <ul className="space-y-2">
            {receivedInvites.map((invite) => (
              <li key={invite.inviteId} className="flex justify-between items-center p-2 border-b border-gray-100">
                <span>{invite.sender.name} ({invite.sender.email})</span>
                <button
                  onClick={() => handleAcceptInvite(invite.inviteId)}
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition text-sm"
                >
                  Accept
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No received invites</p>
        )}
      </div>

      {/* Sent Invites */}
      <div className="bg-white p-4 rounded-lg shadow mt-6">
        <h2 className="text-lg font-semibold mb-4">Sent Invites</h2>
        {loading ? (
          <p className="text-gray-500">Loading invites...</p>
        ) : sentInvites.length > 0 ? (
          <ul className="space-y-2">
            {sentInvites.map((invite) => (
              <li key={invite.inviteId} className="p-2 border-b border-gray-100">
                <span>{invite.receiver.name} {invite.receiver.email} - {invite.status}</span>
                
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No sent invites</p>
        )}
      </div>
    </div>
  );
}
