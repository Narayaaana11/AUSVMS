import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

// Create a socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000,
  withCredentials: true,
});

// Socket event listeners
export const setupSocketListeners = (userId: string) => {
  // Connect to socket server
  if (!socket.connected) {
    socket.auth = { userId };
    socket.connect();
  }

  // Connection events
  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${reason}`);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return () => {
    socket.off('connect');
    socket.off('disconnect');
    socket.off('connect_error');
    socket.disconnect();
  };
};