import Joi from "joi";

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(120),
  phone: Joi.string().pattern(/^\+?[0-9]{7,15}$/).allow("", null).messages({
    "string.pattern.base": "رقم هاتف غير صحيح",
  }),
  birthdate: Joi.date().iso().less("now").allow(null).messages({
    "date.less": "تاريخ الميلاد غير صحيح",
  }),
  gender: Joi.string().valid("male", "female").allow(null),
  preferred_lang: Joi.string().valid("ar", "en"),
}).min(1);
