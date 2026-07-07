import bcrypt from "bcryptjs";
import Admin from "../../models/admin/Admin.js";
import AdminRole from "../../models/admin/AdminRole.js";
import { generateOtp, verifyOtp } from "../../utils/otp.js";
import { sendOtpEmail, mailerReady } from "../../utils/mailer.js";
import { signAccessToken, setAuthCookie, clearAuthCookie, ADMIN_COOKIE } from "../../utils/token.util.js";

const isDev = process.env.NODE_ENV === "development";
const devOtpField = (code) => (isDev && !mailerReady ? { devOtp: code } : {});

function issueAdminSession(res, admin) {
  const token = signAccessToken({ id: admin.id, kind: "admin", is_demo: admin.is_demo });
  setAuthCookie(res, token, ADMIN_COOKIE);
  return admin.toSafeJSON();
}

/* ===== POST /api/admin/auth/owner-setup — إنشاء المالك (محمي بسرّ .env) ===== */
export async function ownerSetup(req, res) {
  const { name, email, password, secret } = req.body;
  if (!process.env.OWNER_SETUP_SECRET || secret !== process.env.OWNER_SETUP_SECRET)
    return res.status(403).json({ message: "سر غير صحيح" });

  const [owner] = await AdminRole.findOrCreate({
    where: { name: "Owner" },
    defaults: { name: "Owner", permissions: ["*"], is_system: true },
  });

  const hash = await bcrypt.hash(password, 10);
  const existing = await Admin.findOne({ where: { email } });
  const data = { name, password: hash, admin_role_id: owner.id, is_active: true };
  const admin = existing ? await existing.update(data) : await Admin.create({ email, ...data });

  res.status(201).json({ message: "تم إنشاء حساب المالك", admin: admin.toSafeJSON() });
}

/* ===== POST /api/admin/auth/login ===== */
export async function login(req, res) {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ where: { email } });
  if (!admin) return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
  if (!admin.is_active) return res.status(403).json({ message: "الحساب معطّل" });

  const match = await bcrypt.compare(password, admin.password);
  if (!match) return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });

  await admin.update({ last_login_at: new Date() });
  res.json({ message: "تم تسجيل الدخول", admin: issueAdminSession(res, admin) });
}

/* ===== POST /api/admin/auth/logout ===== */
export async function logout(_req, res) {
  clearAuthCookie(res, ADMIN_COOKIE);
  res.json({ message: "تم تسجيل الخروج" });
}

/* ===== POST /api/admin/auth/password/forgot ===== */
export async function forgotPassword(req, res) {
  const { email } = req.body;
  const admin = await Admin.findOne({ where: { email } });
  if (admin) {
    const code = await generateOtp("reset", email);
    await sendOtpEmail(email, code, "reset");
    return res.json({ message: "إن وُجد الحساب فقد أرسلنا كودًا", ...devOtpField(code) });
  }
  res.json({ message: "إن وُجد الحساب فقد أرسلنا كودًا" });
}

/* ===== POST /api/admin/auth/password/reset ===== */
export async function resetPassword(req, res) {
  const { email, otp, password } = req.body;
  const admin = await Admin.findOne({ where: { email } });
  if (!admin) return res.status(404).json({ message: "الحساب غير موجود" });

  const result = await verifyOtp("reset", email, otp);
  if (!result.ok) return res.status(400).json({ message: result.reason });

  admin.password = await bcrypt.hash(password, 10);
  await admin.save();
  res.json({ message: "تم تغيير كلمة المرور" });
}
