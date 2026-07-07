import { io } from "socket.io-client";
import { ORIGIN } from "./api";

let socket = null;
export function getSocket() {
  if (!socket) {
    socket = io(ORIGIN || "/", { withCredentials: true, autoConnect: false });
  }
  return socket;
}
