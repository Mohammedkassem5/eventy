import api from "../lib/api";

export const supportApi = {
  messages: () => api.get("/support/messages").then((r) => r.data), // { messages, session }
  send: (body) => api.post("/support/messages", { body }).then((r) => r.data), // { message, session }
  close: () => api.post("/support/close").then((r) => r.data),
  rate: (sessionId, rating, comment) => api.post(`/support/sessions/${sessionId}/rate`, { rating, comment }).then((r) => r.data),
};
