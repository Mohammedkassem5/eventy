import Joi from "joi";

export const createCategorySchema = Joi.object({
  name_ar: Joi.string().min(2).max(120).required(),
  name_en: Joi.string().min(2).max(120).required(),
  slug: Joi.string().max(140).allow("", null),
  icon: Joi.string().max(20).allow("", null),
  image: Joi.string().max(255).allow("", null),
  sort_order: Joi.number().integer().min(0),
  is_active: Joi.boolean(),
});

export const updateCategorySchema = Joi.object({
  name_ar: Joi.string().min(2).max(120),
  name_en: Joi.string().min(2).max(120),
  slug: Joi.string().max(140),
  icon: Joi.string().max(20).allow("", null),
  image: Joi.string().max(255).allow("", null),
  sort_order: Joi.number().integer().min(0),
  is_active: Joi.boolean(),
}).min(1);

export const reorderSchema = Joi.object({
  order: Joi.array().items(Joi.number().integer()).min(1).required(),
});
