import { Router } from "express";
import Joi from "joi";
import verifyAdmin from "../../middleware/auth/verifyAdmin.js";
import authorizePermission from "../../middleware/auth/authorizePermission.js";
import validate from "../../middleware/validate.js";
import { venueUpload } from "../../config/multer.js";
import {
  adminListVenues, createVenue, updateVenue, deleteVenue, uploadVenueMap,
} from "../../controllers/admin/venueController.js";

const base = {
  name_en: Joi.string().max(160).allow("", null),
  type: Joi.string().valid("stadium", "theater", "hall", "arena", "open_air", "other"),
  address: Joi.string().max(300).allow("", null),
  city: Joi.string().max(80).allow("", null),
  capacity: Joi.number().integer().min(0).allow(null),
  lat: Joi.number().allow(null),
  lng: Joi.number().allow(null),
  is_active: Joi.boolean(),
  sort_order: Joi.number().integer().min(0),
};
const createSchema = Joi.object({ ...base, name_ar: Joi.string().min(2).max(160).required() });
const updateSchema = Joi.object({ ...base, name_ar: Joi.string().min(2).max(160) }).min(1);

const router = Router();
router.use(verifyAdmin, authorizePermission("venues.manage"));
router.get("/", adminListVenues);
router.post("/", validate(createSchema), createVenue);
router.patch("/:id", validate(updateSchema), updateVenue);
router.delete("/:id", deleteVenue);
router.post("/:id/map", venueUpload.single("image"), uploadVenueMap);

export default router;
