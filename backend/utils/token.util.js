import jwt from "jsonwebtoken";

export const CUSTOMER_COOKIE = "access_token"; // كوكي عملاء الموقع
export const ADMIN_COOKIE = "admin_token"; // كوكي لوحة التحكم — منفصل تمامًا

// يوقّع access token
export function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

export function setAuthCookie(res, token, name = CUSTOMER_COOKIE) {
  res.cookie(name, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
  });
}

export function clearAuthCookie(res, name = CUSTOMER_COOKIE) {
  res.clearCookie(name);
}
