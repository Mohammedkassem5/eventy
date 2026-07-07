import api from "../lib/api";

export const userApi = {
  list: (params) => api.get("/admin/users", { params }).then((r) => r.data),
  get: (id) => api.get(`/admin/users/${id}`).then((r) => r.data),
  ban: (id, body) => api.patch(`/admin/users/${id}/ban`, body).then((r) => r.data),
  unban: (id) => api.patch(`/admin/users/${id}/unban`).then((r) => r.data),
  adjustPoints: (id, delta) => api.patch(`/admin/users/${id}/points`, { delta }).then((r) => r.data),
};
