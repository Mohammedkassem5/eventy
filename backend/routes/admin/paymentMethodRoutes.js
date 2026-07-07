import { Router } from "express";
import verifyAdmin from "../../middleware/auth/verifyAdmin.js";
import authorizePermission from "../../middleware/auth/authorizePermission.js";
import { adminListPaymentMethods, updatePaymentMethod } from "../../controllers/public/paymentMethodController.js";

const router = Router();
router.use(verifyAdmin, authorizePermission("payments.manage"));
router.get("/", adminListPaymentMethods);
router.patch("/:id", updatePaymentMethod);
export default router;
