import axios from "axios";
import { attachDemoInterceptors } from "./demo";

// عميل HTTP موحّد — same-origin عبر Vite proxy، يرسل الكوكيز
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

attachDemoInterceptors(api);

// أصل الباك إند (بدون /api) — لبناء روابط الصور المرفوعة
const ORIGIN = (import.meta.env.VITE_API_URL || "/api").replace(/\/api\/?$/, "");
export const mediaUrl = (p) => (!p ? "" : p.startsWith("http") ? p : `${ORIGIN}${p}`);

// يستخرج رسالة الخطأ العربية من الباك إند
export function apiError(err) {
  return (
    err?.response?.data?.errors?.[0] ||
    err?.response?.data?.message ||
    "حدث خطأ، حاول مرة أخرى"
  );
}

export default api;
