import api from "../lib/api";

export const statsApi = {
  dashboard: () => api.get("/admin/stats").then((r) => r.data),
};
