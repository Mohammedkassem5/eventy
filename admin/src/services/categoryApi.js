import api from "../lib/api";

export const categoryApi = {
  list: () => api.get("/admin/categories").then((r) => r.data.categories),
  create: (data) => api.post("/admin/categories", data).then((r) => r.data.category),
  update: (id, data) => api.patch(`/admin/categories/${id}`, data).then((r) => r.data.category),
  remove: (id) => api.delete(`/admin/categories/${id}`).then((r) => r.data),
  reorder: (order) => api.patch("/admin/categories/reorder", { order }).then((r) => r.data),
  uploadImage: (id, file) => {
    const fd = new FormData();
    fd.append("image", file);
    return api.post(`/admin/categories/${id}/image`, fd).then((r) => r.data.category);
  },
};
