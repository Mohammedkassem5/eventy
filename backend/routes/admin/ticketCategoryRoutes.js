import { Router } from "express";
import Joi from "joi";
import verifyAdmin from "../../middleware/auth/verifyAdmin.js";
import authorizePermission from "../../middleware/auth/authorizePermission.js";
import validate from "../../middleware/validate.js";
import {
  adminListTicketCategories,
  createTicketCategory,
  updateTicketCategory,
  deleteTicketCategory,
  categorySeats,
} from "../../controllers/admin/ticketCategoryController.js";

const createSchema = Joi.object({
  event_id: Joi.number().integer().required(),
  name: Joi.string().min(1).max(120).required(),
  price: Joi.number().min(0).required(),
  color_hex: Joi.string().max(9).allow("", null),
  rows_count: Joi.number().integer().min(0).max(100).required(),
  cols_count: Joi.number().integer().min(0).max(100).required(),
  sort_order: Joi.number().integer().min(0),
  points_reward: Joi.number().integer().min(0),
});

// مستطيل
const rectItem = Joi.object({
  x: Joi.number().min(0).max(100),
  y: Joi.number().min(0).max(100),
  w: Joi.number().min(0).max(100),
  h: Joi.number().min(0).max(100),
});
// مضلّع (شكل غير منتظم) — نقاط %
const polyItem = Joi.object({
  points: Joi.array().items(Joi.object({ x: Joi.number().min(0).max(100), y: Joi.number().min(0).max(100) })).min(3).required(),
});
// المضلّع أولًا — وإلا Joi يطابق المستطيل (حقوله اختيارية) ويحذف points
const zoneItem = Joi.alternatives().try(polyItem, rectItem);
// المنطقة: كائن واحد أو مصفوفة أشكال أو null
const zoneSchema = Joi.alternatives().try(Joi.array().items(zoneItem), zoneItem).allow(null);

const updateSchema = Joi.object({
  name: Joi.string().min(1).max(120),
  price: Joi.number().min(0),
  color_hex: Joi.string().max(9).allow("", null),
  sort_order: Joi.number().integer().min(0),
  points_reward: Joi.number().integer().min(0),
  zone: zoneSchema,
}).min(1); // يجب إرسال حقل واحد على الأقل

const router = Router();
router.use(verifyAdmin, authorizePermission("tickets.manage"));

router.get("/event/:eventId", adminListTicketCategories);
router.get("/:id/seats", categorySeats);
router.post("/", validate(createSchema), createTicketCategory);
router.patch("/:id", validate(updateSchema), updateTicketCategory);
router.delete("/:id", deleteTicketCategory);

export default router;
