import api from "../lib/api";

export const meApi = {
  get: () => api.get("/admin/me").then((r) => r.data), // { user, role, permissions }
};
