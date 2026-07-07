import api from "../lib/api";

export const settingsApi = {
  list: () => api.get("/admin/settings").then((r) => r.data.settings),
  update: (key, value) => api.patch(`/admin/settings/${key}`, { value }).then((r) => r.data.setting),
  create: (body) => api.post("/admin/settings", body).then((r) => r.data.setting),
  remove: (key) => api.delete(`/admin/settings/${key}`).then((r) => r.data),
};

export const auditApi = {
  list: (params) => api.get("/admin/audit", { params }).then((r) => r.data),
};
