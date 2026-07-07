import { create } from "zustand";
import { setDemo } from "../lib/demo";

// حالة المصادقة — مصدر الحقيقة هو الكوكي (JWT) + GET /api/auth/me
// ready=false لحد ما نتأكد من الجلسة عند فتح التطبيق
export const useAuth = create((set) => ({
  user: null,
  ready: false,
  setUser: (user) => { setDemo(user?.is_demo); set({ user }); },
  clearUser: () => set({ user: null }),
  setReady: (ready) => set({ ready }),
}));
