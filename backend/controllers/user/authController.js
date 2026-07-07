import bcrypt from "bcryptjs";
import User from "../../models/user/User.js";
import { generateOtp, verifyOtp } from "../../utils/otp.js";
import { sendOtpEmail, mailerReady } from "../../utils/mailer.js";
import { signAccessToken, setAuthCookie, clearAuthCookie } from "../../utils/token.util.js";

const isDev = process.env.NODE_ENV === "development";

// يصدر كوكي جلسة العميل ويرجّع بياناته الآمنة
function issueSession(res, user) {
  const token = signAccessToken({ id: user.id, kind: "customer", is_demo: user.is_demo });
  setAuthCookie(res, token);
  return user.toSafeJSON();
}

// لو dev ومفيش SMTP — نرجّع الكود في الرد عشان الاختبار
const devOtpField = (code) => (isDev && !mailerReady ? { devOtp: code } : {});

/* ===== POST /api/auth/register ===== */
export async function register(req, res) {
  const { name, email, password, phone } = req.body;

  // بريد مستخدم بالفعل؟ (حساب موقع مفعّل أو حساب لوحة تحكم)
  const existing = await User.findOne({ where: { email } });
  if (existing && existing.is_verified) {
    return res.status(409).json({ message: "هذا البريد مسجَّل بالفعل — سجّل الدخول بدلًا من ذلك", field: "email" });
  }
  const { default: Admin } = await import("../../models/admin/Admin.js");
  if (await Admin.findOne({ where: { email } })) {
    return res.status(409).json({ message: "هذا البريد مسجَّل بالفعل", field: "email" });
  }

  const hash = await bcrypt.hash(password, 10);
  let user = existing;
  if (user) {
    // حساب موجود لكن غير مفعّل — حدّث بياناته وأعد إرسال الكود
    await user.update({ name, password: hash, phone });
  } else {
    user = await User.create({ name, email, password: hash, phone, is_verified: false });
  }

  const code = await generateOtp("verify", email);
  await sendOtpEmail(email, code, "verify");
  res.status(201).json({
    message: existing
      ? "الحساب موجود لكن غير مفعّل — أرسلنا كود تحقق جديدًا"
      : "تم إرسال كود التحقق",
    ...devOtpField(code),
  });
}

/* ===== POST /api/auth/register/verify ===== */
export async function verifyRegister(req, res) {
  const { email, otp } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

  const result = await verifyOtp("verify", email, otp);
  if (!result.ok) return res.status(400).json({ message: result.reason });

  await user.update({ is_verified: true });
  res.json({ message: "تم تفعيل الحساب", user: issueSession(res, user) });
}

/* ===== POST /api/auth/login ===== */
export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
  if (user.is_banned) return res.status(403).json({ message: "الحساب محظور" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });

  if (!user.is_verified) {
    const code = await generateOtp("verify", email);
    await sendOtpEmail(email, code, "verify");
    return res.status(403).json({
      message: "الحساب غير مفعّل — أرسلنا كود تحقق جديد",
      needVerify: true,
      ...devOtpField(code),
    });
  }

  res.json({ message: "تم تسجيل الدخول", user: issueSession(res, user) });
}

/* ===== POST /api/auth/otp/resend ===== */
export async function resendOtp(req, res) {
  const { email, purpose } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

  const code = await generateOtp(purpose, email);
  await sendOtpEmail(email, code, purpose);
  res.json({ message: "تم إرسال الكود", ...devOtpField(code) });
}

/* ===== POST /api/auth/password/forgot ===== */
export async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ where: { email } });
  // لا نكشف وجود الحساب من عدمه
  if (user) {
    const code = await generateOtp("reset", email);
    await sendOtpEmail(email, code, "reset");
    return res.json({ message: "إن وُجد الحساب فقد أرسلنا كودًا", ...devOtpField(code) });
  }
  res.json({ message: "إن وُجد الحساب فقد أرسلنا كودًا" });
}

/* ===== POST /api/auth/password/reset ===== */
export async function resetPassword(req, res) {
  const { email, otp, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

  const result = await verifyOtp("reset", email, otp);
  if (!result.ok) return res.status(400).json({ message: result.reason });

  const hash = await bcrypt.hash(password, 10);
  await user.update({ password: hash, is_verified: true });
  res.json({ message: "تم تغيير كلمة المرور", user: issueSession(res, user) });
}

/* ===== GET /api/auth/me ===== */
export async function me(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
  res.json({ user: user.toSafeJSON() });
}

/* ===== POST /api/auth/logout ===== */
export async function logout(_req, res) {
  clearAuthCookie(res);
  res.json({ message: "تم تسجيل الخروج" });
}
