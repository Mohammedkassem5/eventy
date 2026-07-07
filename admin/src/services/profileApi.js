import api from "../lib/api";

export const profileApi = {
  get: () => api.get("/admin/profile").then((r) => r.data),
  update: (body) => api.patch("/admin/profile", body).then((r) => r.data.admin),
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append("avatar", file);
    return api.post("/admin/profile/avatar", fd).then((r) => r.data.admin);
  },
};
