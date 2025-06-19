import { Server } from 'socket.io';

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
      socket.join(userId);
      console.log(`✅ User ${userId} connected to room`);
    }

    socket.on("send-message", (message) => {
      const { receiver, sender } = message;
      io.to(receiver).emit("receive-message", message);
      io.to(sender).emit("receive-message", message); // Also emit back to sender for confirmation
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id);
    });
  });

  return io;
}

export default setupSocket;
