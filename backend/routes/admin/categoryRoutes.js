import { Router } from "express";
import verifyAdmin from "../../middleware/auth/verifyAdmin.js";
import authorizePermission from "../../middleware/auth/authorizePermission.js";
import validate from "../../middleware/validate.js";
import { categoryUpload } from "../../config/multer.js";
import {
  adminListCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  uploadCategoryImage,
} from "../../controllers/admin/categoryController.js";
import {
  createCategorySchema,
  updateCategorySchema,
  reorderSchema,
} from "../../validations/admin/categoryValidation.js";

const router = Router();

// تحتاج صلاحية إدارة الأنواع
router.use(verifyAdmin, authorizePermission("categories.manage"));

router.get("/", adminListCategories);
router.post("/", validate(createCategorySchema), createCategory);
router.patch("/reorder", validate(reorderSchema), reorderCategories);
router.patch("/:id", validate(updateCategorySchema), updateCategory);
router.delete("/:id", deleteCategory);
router.post("/:id/image", categoryUpload.single("image"), uploadCategoryImage);

export default router;
