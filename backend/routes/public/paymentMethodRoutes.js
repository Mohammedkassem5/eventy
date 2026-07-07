import { Router } from "express";
import { listPaymentMethods } from "../../controllers/public/paymentMethodController.js";

const router = Router();
router.get("/", listPaymentMethods);
export default router;
