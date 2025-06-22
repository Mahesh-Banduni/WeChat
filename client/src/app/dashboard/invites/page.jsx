"use client";

import { useState, useEffect } from 'react';
import { UserPlus, Mail, User, Check, Clock, Send, Users, Heart } from 'lucide-react';
import useAuth from '@/hooks/useAuth';
import api from '@/lib/api';
import { errorToast } from '@/components/ui/toast';

export default function InvitesPage() {
  const { user } = useAuth();
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const response = await api.get('/connection/invites');
      setInvites(response.data.result || []);
    } catch (error) {
      //errorToast(error.response?.data?.error);
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
      setSendingInvite(true);
      const response = await api.post('/connection/send-invite', { email });
      if(response.status===201){
        successToast(response?.data?.message);
        setEmail('');
        await fetchInvites();
      }
      errorToast(response?.data?.error);
    } catch (error) {
      errorToast(error.response?.data?.error);
      setEmail('');
      //console.error('Error sending invite:', error);
    } finally {
      setSendingInvite(false);
    }
  };

  const handleAcceptInvite = async (inviteId) => {
    try {
      const response = await api.post(`/connection/accept-invite/${inviteId}`);
      if(response.status===200){
        successToast(response?.data?.message);
        await fetchInvites();
      }
      await fetchInvites();
      errorToast(response?.data?.error);
    } catch (error) {
      errorToast(error.response?.data?.error);
      //console.error('Error accepting invite:', error);
    }
  };

  const receivedInvites = invites.filter(invite => invite.receiver?.userId === user?.userId);
  const sentInvites = invites.filter(invite => invite.sender?.userId === user?.userId);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Static Background Pattern */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/3 via-slate-50 to-indigo-400/5"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-400/8 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/5 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3"></div>
      </div>

      {/* Header */}
      <div className="relative bg-white border-b border-slate-200 top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center flex-wrap gap-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-400 rounded-2xl flex items-center justify-center text-white shadow-md">
                <UserPlus className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Connect & Invite
              </h1>
              <p className="text-sm text-slate-600">
                Build meaningful connections with your network
              </p>
            </div>
          </div>
          <div className="hidden sm:inline bg-blue-50 border border-blue-100 px-4 py-2 rounded-full">
            <span className="text-sm font-medium text-blue-600">
              {receivedInvites.length + sentInvites.length} Active
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
        {/* Send Invite Section */}
        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 p-6 lg:p-8">
          <div className="flex items-center space-x-3 lg:space-x-4 mb-6">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-400 rounded-xl flex items-center justify-center text-white">
              <Mail className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl md:text-lg lg:text-lg xl:text-lg font-semibold text-slate-900">Send New Invite</h2>
              <p className="text-sm text-slate-600 mt-1 hidden sm:block">Invite someone to join your network</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1 relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address..."
                className="w-full bg-slate-50 border-2 border-slate-200 hover:border-blue-300 focus:border-blue-400 focus:bg-white rounded-xl lg:rounded-2xl px-4 py-3 lg:px-6 lg:py-4 text-slate-700 placeholder-slate-400 focus:outline-none transition-colors duration-200 text-sm md:text-sm lg:text-sm xl:text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendInvite();
                }}
              />
              {email && (
                <div className="absolute right-4 lg:right-6 top-1/2 transform -translate-y-1/2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                </div>
              )}
            </div>
            <button
              onClick={handleSendInvite}
              disabled={!email.trim() || sendingInvite}
              className={`px-6 py-3 lg:px-8 lg:py-4 rounded-xl lg:rounded-2xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 text-sm md:text-sm lg:text-sm xl:text-sm ${
                email.trim() && !sendingInvite
                  ? 'bg-blue-400 text-white shadow-md hover:bg-blue-500 hover:shadow-lg active:scale-98'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {sendingInvite ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">{sendingInvite ? 'Sending...' : 'Send'}</span>
            </button>
          </div>
        </div>
        
        {/* Received Invites */}
        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3 lg:space-x-4">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-emerald-400 rounded-xl flex items-center justify-center text-white">
                <Heart className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-lg lg:text-lg xl:text-lg font-semibold text-slate-900">Received Invites</h2>
                <p className="text-sm text-slate-600 mt-1 hidden sm:block">Invitations waiting for your response</p>
              </div>
            </div>
            {receivedInvites.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full">
                <span className="text-xs lg:text-sm font-medium text-emerald-600">{receivedInvites.length}</span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 lg:py-16">
              <div className="animate-spin rounded-full h-8 w-8 lg:h-10 lg:w-10 border-2 border-slate-200 border-t-blue-400"></div>
              <p className="text-slate-500 mt-4 text-sm lg:text-base">Loading invites...</p>
            </div>
          ) : receivedInvites.length > 0 ? (
            <div className="space-y-4 lg:space-y-6">
              {receivedInvites.map((invite, index) => (
                <div
                  key={invite.inviteId}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 lg:p-6 bg-slate-50 hover:bg-blue-50 rounded-xl lg:rounded-2xl border border-transparent hover:border-blue-100 transition-colors duration-200 space-y-4 sm:space-y-0"
                >
                  <div className="flex items-center space-x-4 lg:space-x-6">
                    <div className="relative">
                      <div className="w-12 h-12 lg:w-14 lg:h-14 bg-blue-400 rounded-xl lg:rounded-2xl flex items-center justify-center text-white shadow-sm font-medium text-base md:text-base lg:text-base xl:text-base">
                        {invite.sender.name.charAt(0)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 lg:w-5 lg:h-5 bg-emerald-400 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900 text-base md:text-base lg:text-base xl:text-base truncate">{invite.sender.name}</div>
                      <div className="text-slate-600 flex items-center space-x-2 mt-1 text-sm">
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{invite.sender.email}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAcceptInvite(invite.inviteId)}
                    className="bg-emerald-400 hover:bg-emerald-500 text-white px-6 py-3 lg:px-8 lg:py-3 rounded-xl font-medium flex items-center justify-center space-x-2 transition-colors duration-200 shadow-sm hover:shadow-md active:scale-98 w-full sm:w-auto text-sm md:text-sm lg:text-sm xl:text-sm"
                  >
                    <Check className="w-4 h-4 lg:w-5 lg:h-5" />
                    <span>Accept</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 lg:py-16">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 lg:w-10 lg:h-10 text-slate-400" />
              </div>
              <p className="text-slate-500 text-base md:text-base lg:text-base xl:text-base font-medium">No pending invites</p>
              <p className="text-slate-400 text-sm mt-2">New invitations will appear here</p>
            </div>
          )}
        </div>

        {/* Sent Invites */}
        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3 lg:space-x-4">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-indigo-400 rounded-xl flex items-center justify-center text-white">
                <User className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-lg lg:text-lg xl:text-lg font-semibold text-slate-900">Sent Invites</h2>
                <p className="text-sm text-slate-600 mt-1 hidden sm:block">Track your sent invitations</p>
              </div>
            </div>
            {sentInvites.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full">
                <span className="text-xs lg:text-sm font-medium text-indigo-600">{sentInvites.length}</span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 lg:py-16">
              <div className="animate-spin rounded-full h-8 w-8 lg:h-10 lg:w-10 border-2 border-slate-200 border-t-indigo-400"></div>
              <p className="text-slate-500 mt-4 text-sm lg:text-base">Loading sent invites...</p>
            </div>
          ) : sentInvites.length > 0 ? (
            <div className="space-y-4 lg:space-y-6">
              {sentInvites.map((invite, index) => (
                <div
                  key={invite.inviteId}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 lg:p-6 bg-slate-50 hover:bg-indigo-50 rounded-xl lg:rounded-2xl border border-transparent hover:border-indigo-100 transition-colors duration-200 space-y-4 sm:space-y-0"
                >
                  <div className="flex items-center space-x-4 lg:space-x-6">
                    <div className="relative">
                      <div className="w-12 h-12 lg:w-14 lg:h-14 bg-indigo-400 rounded-xl lg:rounded-2xl flex items-center justify-center text-white shadow-sm font-medium text-base md:text-base lg:text-base xl:text-base">
                        {invite.receiver.name.charAt(0)}
                      </div>
                      {invite.status === 'accepted' && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 lg:w-5 lg:h-5 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900 text-base md:text-base lg:text-base xl:text-base truncate">{invite.receiver.name}</div>
                      <div className="text-slate-600 flex items-center space-x-2 mt-1 text-sm">
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{invite.receiver.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end space-x-3">
                    <span className={`px-4 py-2 lg:px-6 lg:py-2 rounded-full text-sm font-medium border ${
                      invite.status === 'PENDING' 
                        ? 'bg-amber-50 text-amber-600 border-amber-100' 
                        : invite.status === 'accepted'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {invite.status === 'PENDING' ? 'Pending' : invite.status === 'accepted' ? 'Accepted' : 'Declined'}
                    </span>
                    {invite.status === 'PENDING' && (
                      <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-amber-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 lg:py-16">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 lg:w-10 lg:h-10 text-slate-400" />
              </div>
              <p className="text-slate-500 text-base md:text-base lg:text-base xl:text-base font-medium">No sent invites</p>
              <p className="text-slate-400 text-sm mt-2">Start connecting by sending your first invite</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8">
        <button
          onClick={() => document.querySelector('input[type="email"]')?.focus()}
          className="w-14 h-14 lg:w-16 lg:h-16 bg-blue-400 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-white transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <UserPlus className="w-6 h-6 lg:w-7 lg:h-7" />
        </button>
      </div>
    </div>
  );
}