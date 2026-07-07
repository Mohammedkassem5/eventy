import { Router } from "express";
import verifyToken from "../../middleware/auth/verifyToken.js";
import { initPaymob, paymobCallback, paymobVerify, paymobStatus } from "../../controllers/user/paymentController.js";

const router = Router();
router.post("/paymob/init", verifyToken, initPaymob); // العميل يبدأ الدفع
router.get("/paymob/status", paymobStatus);            // استعلام وتسوية (polling)
router.post("/paymob/callback", paymobCallback);       // Paymob → السيرفر (عام)
router.post("/paymob/verify", paymobVerify);           // تأكيد عبر رجوع المتصفح
export default router;
