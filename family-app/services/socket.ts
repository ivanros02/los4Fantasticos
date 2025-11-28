import { io, Socket } from 'socket.io-client';
import { getToken } from './auth';

let socket: Socket | null = null;

const BACKEND_URL = 'https://family-backend-9l2z.onrender.com'; // cambiar por tu IP

export async function connectSocket() {
  const token = await getToken();
  if (!token) return null;

  socket = io(BACKEND_URL, {
    auth: { token },
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}