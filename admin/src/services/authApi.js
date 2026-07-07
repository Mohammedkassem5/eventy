import api from "../lib/api";

export const authApi = {
  login: (data) => api.post("/admin/auth/login", data).then((r) => r.data),
  logout: () => api.post("/admin/auth/logout").then((r) => r.data),
  forgot: (data) => api.post("/admin/auth/password/forgot", data).then((r) => r.data),
  reset: (data) => api.post("/admin/auth/password/reset", data).then((r) => r.data),
};
