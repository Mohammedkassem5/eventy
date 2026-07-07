import api from "../lib/api";

export const refundApi = {
  list: (params) => api.get("/admin/refunds", { params }).then((r) => r.data),
  approve: (id, note) => api.patch(`/admin/refunds/${id}/approve`, { note }).then((r) => r.data),
  reject: (id, note) => api.patch(`/admin/refunds/${id}/reject`, { note }).then((r) => r.data),
};
