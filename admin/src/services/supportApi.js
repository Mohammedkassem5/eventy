import api from "../lib/api";

export const supportApi = {
  conversations: () => api.get("/admin/support/conversations").then((r) => r.data.conversations),
  messages: (userId) => api.get(`/admin/support/${userId}`).then((r) => r.data), // { messages, session }
  reply: (userId, body) => api.post(`/admin/support/${userId}/reply`, { body }).then((r) => r.data.message),
  close: (userId) => api.post(`/admin/support/${userId}/close`).then((r) => r.data),
  context: (userId) => api.get(`/admin/support/${userId}/context`).then((r) => r.data),
};
