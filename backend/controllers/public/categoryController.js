import Category from "../../models/category/Category.js";

/* ===== GET /api/categories — للعرض العام (المفعّلة فقط) ===== */
export async function listCategories(_req, res) {
  const categories = await Category.findAll({
    where: { is_active: true },
    order: [
      ["sort_order", "ASC"],
      ["id", "ASC"],
    ],
  });
  res.json({ categories });
}
