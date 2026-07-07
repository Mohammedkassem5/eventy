import crypto from "crypto";

const BASE = "https://accept.paymob.com/api";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Paymob ${path} → ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}

// 1) توكن المصادقة من الـ API Key
export async function authToken() {
  const d = await post("/auth/tokens", { api_key: process.env.PAYMOB_API_KEY });
  return d.token;
}

// 2) إنشاء طلب (order) — merchantOrderId = مرجع الحجز (فريد)
export async function createOrder(token, amountCents, merchantOrderId) {
  const d = await post("/ecommerce/orders", {
    auth_token: token,
    delivery_needed: false,
    amount_cents: amountCents,
    currency: "EGP",
    merchant_order_id: merchantOrderId,
    items: [],
  });
  return d.id;
}

// 3) مفتاح الدفع (payment key) لتكامل الكارت
export async function paymentKey(token, amountCents, orderId, billing) {
  const redirectUrl = `${process.env.FRONTEND_URL}/booking/processing`;
  const d = await post("/acceptance/payment_keys", {
    auth_token: token,
    amount_cents: amountCents,
    expiration: 3600,
    order_id: orderId,
    billing_data: billing,
    currency: "EGP",
    integration_id: Number(process.env.PAYMOB_CARD_INTEGRATION_ID),
    lock_order_when_paid: true,
    redirection_url: redirectUrl,
  });
  return d.token;
}

// رابط الـ iframe الذي يُوجّه إليه العميل
export function iframeUrl(paymentToken) {
  return `${BASE}/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;
}

// استعلام حالة المعاملة بمرجع الطلب (merchant_order_id) — للتسوية بدون الاعتماد على redirect
export async function inquire(token, merchantOrderId) {
  const d = await post("/ecommerce/orders/transaction_inquiry", {
    auth_token: token,
    merchant_order_id: merchantOrderId,
  });
  // d قد يكون كائن المعاملة مباشرة
  return { success: d?.success === true, obj: d };
}

// بيانات فوترة افتراضية آمنة (الحقول المطلوبة من Paymob)
export function billingData(user, seatsCount) {
  const [first, ...rest] = String(user?.name || "Eventy User").trim().split(" ");
  return {
    first_name: first || "Eventy",
    last_name: rest.join(" ") || "User",
    email: user?.email || "user@eventy.com",
    phone_number: user?.phone || "+201000000000",
    apartment: "NA", floor: "NA", street: "NA", building: "NA",
    shipping_method: "NA", postal_code: "NA", city: "Cairo",
    country: "EG", state: "NA", extra_description: `${seatsCount} tickets`,
  };
}

// التحقق من HMAC للـ callback (منع التلاعب)
const HMAC_ORDER = [
  "amount_cents", "created_at", "currency", "error_occured", "has_parent_transaction",
  "id", "integration_id", "is_3d_secure", "is_auth", "is_capture", "is_refunded",
  "is_standalone_payment", "is_voided", "order.id", "owner", "pending",
  "source_data.pan", "source_data.sub_type", "source_data.type", "success",
];
const dig = (o, path) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), o);

export function verifyHmac(obj, receivedHmac) {
  const concat = HMAC_ORDER.map((k) => {
    const v = dig(obj, k);
    return v === true ? "true" : v === false ? "false" : v == null ? "" : String(v);
  }).join("");
  const calc = crypto.createHmac("sha512", process.env.PAYMOB_HMAC).update(concat).digest("hex");
  return calc === String(receivedHmac);
}
