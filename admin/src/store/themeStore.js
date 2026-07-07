import { create } from "zustand";
import { persist } from "zustand/middleware";

const apply = (t) => {
  document.documentElement.dataset.theme = t;
};

export const useTheme = create(
  persist(
    (set, get) => ({
      theme: "light",
      toggle: () => {
        const next = get().theme === "light" ? "dark" : "light";
        apply(next);
        set({ theme: next });
      },
      sync: () => apply(get().theme),
    }),
    {
      name: "eventy-admin-theme",
      onRehydrateStorage: () => (state) => state && apply(state.theme),
    }
  )
);
