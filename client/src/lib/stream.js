// lib/stream.ts
import { StreamChat } from 'stream-chat';

let streamClient = null;

export const initStreamClient = async (apiKey, userId, token) => {
  if (!streamClient) {
    streamClient = StreamChat.getInstance(apiKey);
    await streamClient.connectUser({ id: userId }, token);
  }
  return streamClient;
};

export const getStreamClient = () => {
  if (!streamClient) throw new Error("Stream client not initialized");
  return streamClient;
};
