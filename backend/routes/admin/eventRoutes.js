import { Router } from "express";
import verifyAdmin from "../../middleware/auth/verifyAdmin.js";
import authorizePermission from "../../middleware/auth/authorizePermission.js";
import validate from "../../middleware/validate.js";
import { eventUpload } from "../../config/multer.js";
import {
  adminListEvents,
  adminGetEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  uploadPoster,
  uploadGallery,
  uploadSeatmap,
} from "../../controllers/admin/eventController.js";
import {
  createEventSchema,
  updateEventSchema,
} from "../../validations/admin/eventValidation.js";

const router = Router();
router.use(verifyAdmin, authorizePermission("events.manage"));

router.get("/", adminListEvents);
router.get("/:id", adminGetEvent);
router.post("/", validate(createEventSchema), createEvent);
router.patch("/:id", validate(updateEventSchema), updateEvent);
router.delete("/:id", deleteEvent);
router.post("/:id/poster", eventUpload.single("poster"), uploadPoster);
router.post("/:id/gallery", eventUpload.array("images", 8), uploadGallery);
router.post("/:id/seatmap", eventUpload.single("image"), uploadSeatmap);

export default router;
