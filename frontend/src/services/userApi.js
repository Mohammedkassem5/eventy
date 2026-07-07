import api from "../lib/api";

export const userApi = {
  updateProfile: (data) => api.patch("/user/profile", data).then((r) => r.data),
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append("avatar", file);
    return api.post("/user/avatar", fd).then((r) => r.data);
  },
};
