import api from "../lib/api";

export const ticketApi = {
  categories: (eventId) =>
    api.get(`/events/${eventId}/ticket-categories`).then((r) => r.data.categories),
  seats: (eventId, categoryId, sessionId) =>
    api
      .get(`/events/${eventId}/seats`, { params: { category: categoryId, session_id: sessionId } })
      .then((r) => r.data.seats),
};
