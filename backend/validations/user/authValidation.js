import Joi from "joi";

const email = Joi.string().email().required().messages({
  "string.email": "بريد إلكتروني غير صحيح",
  "any.required": "البريد الإلكتروني مطلوب",
  "string.empty": "البريد الإلكتروني مطلوب",
});

// كلمة مرور الدخول — فحص وجود فقط (حسابات قديمة قد تكون بصيغة مختلفة)
const password = Joi.string().required().messages({
  "any.required": "كلمة المرور مطلوبة",
  "string.empty": "كلمة المرور مطلوبة",
});

// كلمة مرور جديدة — 6 إلى 8 أحرف، حرف كبير + حرف صغير + رقم
export const newPassword = Joi.string()
  .min(6)
  .pattern(/[a-z]/, "lower")
  .pattern(/[A-Z]/, "upper")
  .pattern(/[0-9]/, "digit")
  .required()
  .messages({
    "string.min": "كلمة المرور 6 أحرف على الأقل",
    "string.pattern.name": "كلمة المرور يجب أن تحتوي حرفًا كبيرًا وحرفًا صغيرًا ورقمًا",
    "any.required": "كلمة المرور مطلوبة",
    "string.empty": "كلمة المرور مطلوبة",
  });

const otp = Joi.string().length(6).pattern(/^\d+$/).required().messages({
  "string.length": "الكود 6 أرقام",
  "string.pattern.base": "الكود أرقام فقط",
});

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(120).required().messages({
    "string.min": "اكتب اسمك",
    "any.required": "الاسم مطلوب",
    "string.empty": "الاسم مطلوب",
  }),
  email,
  password: newPassword,
  phone: Joi.string().pattern(/^\+?[0-9]{7,15}$/).allow("", null).messages({
    "string.pattern.base": "رقم هاتف غير صحيح",
  }),
});

export const loginSchema = Joi.object({ email, password });
export const verifySchema = Joi.object({ email, otp });
export const forgotSchema = Joi.object({ email });
export const resetSchema = Joi.object({ email, otp, password: newPassword });
export const resendSchema = Joi.object({
  email,
  purpose: Joi.string().valid("verify", "reset").default("verify"),
});
