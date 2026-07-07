import jwt from "jsonwebtoken";
import Admin from "../../models/admin/Admin.js";
import { ADMIN_COOKIE } from "../../utils/token.util.js";

// مشرفو لوحة التحكم — يقرأ كوكي admin_token المنفصل
export default async function verifyAdmin(req, res, next) {
  try {
    const token =
      req.cookies?.[ADMIN_COOKIE] ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) return res.status(401).json({ message: "غير مصرّح — سجّل الدخول" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.kind !== "admin") return res.status(401).json({ message: "توكن غير صالح" });

    const admin = await Admin.findByPk(decoded.id);
    if (!admin || !admin.is_active) return res.status(401).json({ message: "الحساب غير مفعّل" });

    // حساب تجريبي: امنع أي حفظ فعلي (شبكة أمان — الواجهة أصلًا لا ترسل)
    if (admin.is_demo && !["GET", "HEAD", "OPTIONS"].includes(req.method))
      return res.status(403).json({ message: "وضع تجريبي: التغييرات لا تُحفظ", demo: true });

    req.admin = admin; // كائن الأدمن الكامل
    next();
  } catch {
    return res.status(401).json({ message: "توكن غير صالح أو منتهي" });
  }
}
