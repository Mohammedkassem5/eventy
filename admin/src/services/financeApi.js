import api from "../lib/api";

export const financeApi = {
  overview: (params) => api.get("/admin/finance", { params }).then((r) => r.data),
};
