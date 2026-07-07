import api from "../lib/api";

export const venueApi = {
  list: () => api.get("/admin/venues").then((r) => r.data.venues),
  create: (data) => api.post("/admin/venues", data).then((r) => r.data.venue),
  update: (id, data) => api.patch(`/admin/venues/${id}`, data).then((r) => r.data.venue),
  remove: (id) => api.delete(`/admin/venues/${id}`).then((r) => r.data),
  uploadMap: (id, file) => {
    const fd = new FormData();
    fd.append("image", file);
    return api.post(`/admin/venues/${id}/map`, fd).then((r) => r.data.venue);
  },
};
