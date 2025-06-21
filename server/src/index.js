// src/index.js (or app.js if it runs the API server)
import dotenv from 'dotenv';
import { initSocketClient } from './socket/socket-client.js';
import app from './server.js';

dotenv.config();

const SOCKET_URL = process.env.SOCKET_URL;
const API_PORT = process.env.API_PORT || 8000;

initSocketClient(SOCKET_URL);

app.listen(API_PORT, () => {
  console.log(`✅ API server running on port ${API_PORT}`);
});
