"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import useAuth from '@/hooks/useAuth';
import { successToast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const router= useRouter();
  const { user, loading } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (loading || !user?.userId) return;

    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket'],
    });

    const handleConnect = () => {
      console.log('Socket connected:', socketInstance.id);
      socketInstance.emit('join', { userId: user.userId });
    };

    const handleDisconnect = () => {
      console.log('Socket disconnected');
    };

    // // ✅ Global: Show toast when someone accepts your invite
    // const handleAcceptedInvite = (invite) => {
    //   if (invite.senderId === user.userId) {
    //     successToast(`Congratulations!! ${invite.receiver?.name} accepted your invite!`, () => router.push('/dashboard/chat') );
    //   }
    // };

    // // ✅ Global: Show toast when someone sends you an invite
    // const handleNewInvite = (invite) => {
    //   if (invite.receiverId === user.userId) {
    //     successToast(`Hello New invite from ${invite.sender?.name}`, () => router.push('/dashboard/invites'));
    //   }
    // };

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    //socketInstance.on('accepted_invite', handleAcceptedInvite);
    //socketInstance.on('new_invite', handleNewInvite);

    setSocket(socketInstance);

    // Cleanup
    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      //socketInstance.off('accepted_invite', handleAcceptedInvite);
      //socketInstance.off('new_invite', handleNewInvite);
      socketInstance.disconnect();
    };
  }, [user?.userId, loading]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const socket = useContext(SocketContext);
  if (socket === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return socket;
};
