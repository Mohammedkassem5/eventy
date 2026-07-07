import { create } from "zustand";

// جلسة الأدمن — user + صلاحياته (من /api/admin/me)
export const useAuth = create((set, get) => ({
  admin: null,
  permissions: [],
  roleName: null,
  ready: false,
  setSession: ({ user, permissions, role }) =>
    set({ admin: user, permissions: permissions || [], roleName: role?.name || null }),
  updateAdmin: (patch) => set((s) => ({ admin: { ...s.admin, ...patch } })),
  clear: () => set({ admin: null, permissions: [], roleName: null }),
  setReady: (ready) => set({ ready }),
  can: (perm) => {
    const p = get().permissions;
    return p.includes("*") || p.includes(perm);
  },
}));
