import api from "../lib/api";

export const roleApi = {
  permissions: () => api.get("/admin/permissions").then((r) => r.data.permissions),
  listRoles: () => api.get("/admin/roles").then((r) => r.data.roles),
  createRole: (body) => api.post("/admin/roles", body).then((r) => r.data.role),
  updateRole: (id, body) => api.patch(`/admin/roles/${id}`, body).then((r) => r.data.role),
  deleteRole: (id) => api.delete(`/admin/roles/${id}`).then((r) => r.data),

  listAdmins: () => api.get("/admin/admins").then((r) => r.data.admins),
  createAdmin: (body) => api.post("/admin/admins", body).then((r) => r.data.admin),
  updateAdmin: (id, body) => api.patch(`/admin/admins/${id}`, body).then((r) => r.data.admin),
  removeAdmin: (id) => api.delete(`/admin/admins/${id}`).then((r) => r.data),
};
