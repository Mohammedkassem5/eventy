import Category from "../../models/category/Category.js";
import Event from "../../models/event/Event.js";

const slugify = (s) =>
  s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* ===== GET /api/admin/categories — كل الفئات (للأدمن) ===== */
export async function adminListCategories(_req, res) {
  const categories = await Category.findAll({
    order: [["sort_order", "ASC"], ["id", "ASC"]],
  });
  const withCount = await Promise.all(
    categories.map(async (c) => ({
      ...c.toJSON(),
      events_count: await Event.count({ where: { category_id: c.id } }),
    }))
  );
  res.json({ categories: withCount });
}

/* ===== POST /api/admin/categories ===== */
export async function createCategory(req, res) {
  const { name_ar, name_en, slug, icon, image, sort_order, is_active } = req.body;
  const finalSlug = slug ? slugify(slug) : slugify(name_en);

  const exists = await Category.findOne({ where: { slug: finalSlug } });
  if (exists) return res.status(409).json({ message: "الـ slug مستخدم بالفعل" });

  const category = await Category.create({
    name_ar,
    name_en,
    slug: finalSlug,
    icon: icon || null,
    image: image || null,
    sort_order: sort_order ?? 0,
    is_active: is_active ?? true,
  });
  res.status(201).json({ message: "تمت إضافة الفئة", category });
}

/* ===== PATCH /api/admin/categories/:id ===== */
export async function updateCategory(req, res) {
  const category = await Category.findByPk(req.params.id);
  if (!category) return res.status(404).json({ message: "الفئة غير موجودة" });

  const fields = ["name_ar", "name_en", "icon", "image", "sort_order", "is_active"];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.slug !== undefined) updates.slug = slugify(req.body.slug);

  await category.update(updates);
  res.json({ message: "تم تحديث الفئة", category });
}

/* ===== DELETE /api/admin/categories/:id ===== */
export async function deleteCategory(req, res) {
  const category = await Category.findByPk(req.params.id);
  if (!category) return res.status(404).json({ message: "الفئة غير موجودة" });
  await category.destroy();
  res.json({ message: "تم حذف الفئة" });
}

export async function reorderCategories(req, res) {
  const { order } = req.body;
  await Promise.all(
    order.map((id, i) => Category.update({ sort_order: i }, { where: { id } }))
  );
  res.json({ message: "تم إعادة الترتيب" });
}

export async function uploadCategoryImage(req, res) {
  if (!req.file) return res.status(400).json({ message: "لم يتم رفع أي صورة" });
  const category = await Category.findByPk(req.params.id);
  if (!category) return res.status(404).json({ message: "الفئة غير موجودة" });

  await category.update({ image: `/uploads/categories/${req.file.filename}` });
  res.json({ message: "تم تحديث الصورة", category });
}
