import { Router } from "express";
import verifyAdmin from "../../middleware/auth/verifyAdmin.js";
import authorizePermission from "../../middleware/auth/authorizePermission.js";
import { listRefunds, approveRefund, rejectRefund } from "../../controllers/admin/refundController.js";

const router = Router();
router.use(verifyAdmin, authorizePermission("refunds.manage"));
router.get("/", listRefunds);
router.patch("/:id/approve", approveRefund);
router.patch("/:id/reject", rejectRefund);
export default router;
