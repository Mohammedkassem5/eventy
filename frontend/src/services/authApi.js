import api from "../lib/api";

export const authApi = {
  register: (data) => api.post("/auth/register", data).then((r) => r.data),
  verifyRegister: (data) => api.post("/auth/register/verify", data).then((r) => r.data),
  login: (data) => api.post("/auth/login", data).then((r) => r.data),
  resendOtp: (data) => api.post("/auth/otp/resend", data).then((r) => r.data),
  forgot: (data) => api.post("/auth/password/forgot", data).then((r) => r.data),
  reset: (data) => api.post("/auth/password/reset", data).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
  logout: () => api.post("/auth/logout").then((r) => r.data),
};
