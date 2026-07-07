import { Router } from "express";
import { listCategories } from "../../controllers/public/categoryController.js";

const router = Router();
router.get("/", listCategories);
export default router;
