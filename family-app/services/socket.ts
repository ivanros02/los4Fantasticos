import { io, Socket } from 'socket.io-client';
import { getToken } from './auth';

let socket: Socket | null = null;

const BACKEND_URL = 'http://192.168.100.14:3000'; // cambiar por tu IP

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