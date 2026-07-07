import api from "../lib/api";

export const configApi = {
  get: () => api.get("/config").then((r) => r.data),
};
