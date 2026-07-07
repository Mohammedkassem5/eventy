export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// موبايل مصري (01xxxxxxxxx) أو رقم دولي عام
export const isPhone = (v) =>
  /^01[0-9]{9}$/.test(v.trim()) || /^\+?[0-9]{7,15}$/.test(v.trim());

export const isEmailOrPhone = (v) => isEmail(v) || isPhone(v);

// قواعد كلمة المرور — تُعرض كـ checklist حيّ في الواجهة
export const passwordChecks = (v = "") => [
  { key: "len", label: "6 أحرف على الأقل", ok: v.length >= 6 },
  { key: "upper", label: "حرف كبير واحد على الأقل (A-Z)", ok: /[A-Z]/.test(v) },
  { key: "lower", label: "حرف صغير واحد على الأقل (a-z)", ok: /[a-z]/.test(v) },
  { key: "digit", label: "رقم واحد على الأقل (0-9)", ok: /[0-9]/.test(v) },
];

export const isStrongPassword = (v) => passwordChecks(v).every((c) => c.ok);
