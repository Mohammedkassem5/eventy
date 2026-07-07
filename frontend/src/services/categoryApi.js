import api from "../lib/api";

export const categoryApi = {
  list: () => api.get("/categories").then((r) => r.data.categories),
};
