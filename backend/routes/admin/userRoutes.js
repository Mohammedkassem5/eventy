import { Router } from "express";
import verifyAdmin from "../../middleware/auth/verifyAdmin.js";
import authorizePermission from "../../middleware/auth/authorizePermission.js";
import { listCustomers, getCustomer, banUser, unbanUser, adjustPoints } from "../../controllers/admin/customerController.js";

const router = Router();
router.use(verifyAdmin, authorizePermission("users.manage"));
router.get("/", listCustomers);
router.get("/:id", getCustomer);
router.patch("/:id/ban", banUser);
router.patch("/:id/unban", unbanUser);
router.patch("/:id/points", adjustPoints);
export default router;
