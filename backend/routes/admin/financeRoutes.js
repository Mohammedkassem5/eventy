import { Router } from "express";
import verifyAdmin from "../../middleware/auth/verifyAdmin.js";
import authorizePermission from "../../middleware/auth/authorizePermission.js";
import { financeOverview } from "../../controllers/admin/financeController.js";

const router = Router();
router.use(verifyAdmin, authorizePermission("payments.manage"));
router.get("/", financeOverview);
export default router;
