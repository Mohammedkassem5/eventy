import Joi from "joi";

const base = {
  category_id: Joi.number().integer().allow(null),
  venue_id: Joi.number().integer().allow(null),
  title_en: Joi.string().max(200).allow("", null),
  subtitle: Joi.string().max(200).allow("", null),
  description: Joi.string().allow("", null),
  poster: Joi.string().max(255).allow("", null),
  venue_name: Joi.string().max(160).allow("", null),
  city: Joi.string().max(80).allow("", null),
  date_start: Joi.date().iso().allow(null),
  date_end: Joi.date().iso().allow(null),
  price_from: Joi.number().min(0).allow(null),
  status: Joi.string().valid("draft", "published"),
  is_featured: Joi.boolean(),
  sort_order: Joi.number().integer().min(0),
  guidelines: Joi.array().items(Joi.string().max(500)).allow(null),
  guidelines_title: Joi.string().max(160).allow("", null),
  show_guidelines: Joi.boolean(),
  delivery_mode: Joi.string().valid("branch_pickup", "instant", "before_event"),
  qr_lead_hours: Joi.number().integer().min(0).max(2160),
  gallery: Joi.array().items(Joi.string().max(255)).allow(null),
  pickup_branches: Joi.array()
    .items(Joi.object({
      name: Joi.string().max(160).required(),
      address: Joi.string().max(300).allow("", null),
      map_url: Joi.string().max(300).allow("", null),
    }))
    .allow(null),
};

export const createEventSchema = Joi.object({
  ...base,
  title_ar: Joi.string().min(2).max(200).required(),
});

export const updateEventSchema = Joi.object({
  ...base,
  title_ar: Joi.string().min(2).max(200),
}).min(1);
