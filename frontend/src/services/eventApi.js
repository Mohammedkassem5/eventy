import api from "../lib/api";

export const eventApi = {
  list: (params = {}) =>
    api.get("/events", { params }).then((r) => r.data.events),
  get: (id) => api.get(`/events/${id}`).then((r) => r.data.event),
};
