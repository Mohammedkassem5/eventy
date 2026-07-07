import axios from "axios";
import { attachDemoInterceptors } from "./demo";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

attachDemoInterceptors(api);

export const ORIGIN = (import.meta.env.VITE_API_URL || "/api").replace(/\/api\/?$/, "");
export const mediaUrl = (p) => (!p ? "" : p.startsWith("http") ? p : `${ORIGIN}${p}`);

export function apiError(err) {
  return (
    err?.response?.data?.errors?.[0] ||
    err?.response?.data?.message ||
    "حدث خطأ، حاول مرة أخرى"
  );
}

export default api;
