import { io } from "socket.io-client";

const ORIGIN = (import.meta.env.VITE_API_URL || "/api").replace(/\/api\/?$/, "");

let socket = null;
export function getSocket() {
  if (!socket) {
    socket = io(ORIGIN || "/", { withCredentials: true, autoConnect: false });
  }
  return socket;
}
