import { Router } from "express";
import verifyAdmin from "../../middleware/auth/verifyAdmin.js";
import authorizePermission from "../../middleware/auth/authorizePermission.js";
import {
  adminListBookings,
  adminGetBooking,
  adminCancelBooking,
  adminConfirmPayment,
  adminRejectPayment,
} from "../../controllers/admin/bookingController.js";

const router = Router();
router.use(verifyAdmin, authorizePermission("bookings.manage"));
router.get("/", adminListBookings);
router.get("/:ref", adminGetBooking);
router.patch("/:ref/cancel", adminCancelBooking);
router.patch("/:ref/confirm-payment", adminConfirmPayment);
router.patch("/:ref/reject-payment", adminRejectPayment);
export default router;
