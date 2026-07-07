import jwt from "jsonwebtoken";
import { CUSTOMER_COOKIE } from "../../utils/token.util.js";

// عملاء الموقع — يقرأ كوكي access_token
export default function verifyToken(req, res, next) {
  try {
    const token =
      req.cookies?.[CUSTOMER_COOKIE] ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) return res.status(401).json({ message: "غير مصرّح — لا يوجد توكن" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.kind && decoded.kind !== "customer")
      return res.status(401).json({ message: "توكن غير صالح" });
    // حساب تجريبي: امنع الحفظ الفعلي (شبكة أمان)
    if (decoded.is_demo && !["GET", "HEAD", "OPTIONS"].includes(req.method))
      return res.status(403).json({ message: "وضع تجريبي: التغييرات لا تُحفظ", demo: true });
    req.user = decoded; // { id, kind:'customer', is_demo }
    next();
  } catch {
    return res.status(401).json({ message: "توكن غير صالح أو منتهي" });
  }
}
