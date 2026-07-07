import api from "../lib/api";

export const bookingApi = {
  create: (data) => api.post("/bookings", data).then((r) => r.data.booking),
  list: (status) =>
    api.get("/bookings", { params: status ? { status } : {} }).then((r) => r.data.bookings),
  get: (ref) => api.get(`/bookings/${ref}`).then((r) => r.data.booking),
  cancel: (ref) => api.patch(`/bookings/${ref}/cancel`).then((r) => r.data),
  requestRefund: (ref, reason) => api.post(`/bookings/${ref}/refund`, { reason }).then((r) => r.data),
};

export const paymentApi = {
  // event_id اختياري — لو اتبعت يتم فلترة وسائل الدفع حسب الفعالية (مثلاً إخفاء COD)
  methods: (eventId) =>
    api
      .get("/payment-methods", { params: eventId ? { event_id: eventId } : {} })
      .then((r) => r.data.methods),
  // يبدأ دفع كارت عبر Paymob ويرجّع رابط iframe
  paymobInit: (data) => api.post("/payments/paymob/init", data).then((r) => r.data),
  // يؤكّد نتيجة الدفع من معاملات رجوع المتصفح
  paymobVerify: (params) => api.post("/payments/paymob/verify", params).then((r) => r.data),
  // يستعلم من Paymob مباشرة ويسوّي الحجز (polling)
  paymobStatus: (ref) => api.get("/payments/paymob/status", { params: { ref } }).then((r) => r.data),
};
