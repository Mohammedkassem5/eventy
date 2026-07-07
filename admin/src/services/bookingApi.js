import api from "../lib/api";

export const bookingApi = {
  list: (params) => api.get("/admin/bookings", { params }).then((r) => r.data),
  get: (ref) => api.get(`/admin/bookings/${ref}`).then((r) => r.data.booking),
  cancel: (ref) => api.patch(`/admin/bookings/${ref}/cancel`).then((r) => r.data),
  confirmPayment: (ref) => api.patch(`/admin/bookings/${ref}/confirm-payment`).then((r) => r.data),
  rejectPayment: (ref) => api.patch(`/admin/bookings/${ref}/reject-payment`).then((r) => r.data),
};
