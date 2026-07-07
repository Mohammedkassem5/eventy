import api from "../lib/api";

export const eventApi = {
  list: () => api.get("/admin/events").then((r) => r.data.events),
  get: (id) => api.get(`/admin/events/${id}`).then((r) => r.data.event),
  create: (data) => api.post("/admin/events", data).then((r) => r.data.event),
  update: (id, data) => api.patch(`/admin/events/${id}`, data).then((r) => r.data.event),
  remove: (id) => api.delete(`/admin/events/${id}`).then((r) => r.data),
  uploadPoster: (id, file) => {
    const fd = new FormData();
    fd.append("poster", file);
    return api.post(`/admin/events/${id}/poster`, fd).then((r) => r.data.event);
  },
  uploadGallery: (id, files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("images", f));
    return api.post(`/admin/events/${id}/gallery`, fd).then((r) => r.data.event);
  },
  uploadSeatmap: (id, file) => {
    const fd = new FormData();
    fd.append("image", file);
    return api.post(`/admin/events/${id}/seatmap`, fd).then((r) => r.data.event);
  },
};

export const ticketApi = {
  list: (eventId) => api.get(`/admin/ticket-categories/event/${eventId}`).then((r) => r.data.categories),
  create: (data) => api.post("/admin/ticket-categories", data).then((r) => r.data.category),
  update: (id, data) => api.patch(`/admin/ticket-categories/${id}`, data).then((r) => r.data.category),
  remove: (id) => api.delete(`/admin/ticket-categories/${id}`).then((r) => r.data),
  seats: (id) => api.get(`/admin/ticket-categories/${id}/seats`).then((r) => r.data),
};
