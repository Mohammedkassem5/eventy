import { Router } from "express";
import Joi from "joi";
import verifyToken from "../../middleware/auth/verifyToken.js";
import validate from "../../middleware/validate.js";
import {
  createBooking,
  listBookings,
  getBooking,
  cancelBooking,
  requestRefund,
} from "../../controllers/user/bookingController.js";

const createSchema = Joi.object({
  event_id: Joi.number().integer().required(),
  ticket_category_id: Joi.number().integer().required(),
  seat_ids: Joi.array().items(Joi.number().integer()).min(1).max(20).required(),
  payment_method: Joi.string().max(40).required(),
  points_to_use: Joi.number().integer().min(0),
  session_id: Joi.string().max(80).allow("", null),
});

const router = Router();
router.use(verifyToken);

router.post("/", validate(createSchema), createBooking);
router.get("/", listBookings);
router.get("/:ref", getBooking);
router.patch("/:ref/cancel", cancelBooking);
router.post("/:ref/refund", requestRefund);

export default router;
