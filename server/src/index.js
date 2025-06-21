// src/server.js
import app from './server.js';
const API_PORT = process.env.API_PORT || 8000;

app.listen(API_PORT, () => {
  console.log(`✅ API server running on port ${API_PORT}`);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
