import { Op } from "sequelize";
import Event from "../../models/event/Event.js";
import Category from "../../models/category/Category.js";

const withCategory = {
  model: Category,
  as: "category",
  attributes: ["id", "name_ar", "name_en", "slug", "icon"],
};

/* ===== GET /api/events?category=slug&featured=1&q= ===== */
export async function listEvents(req, res) {
  const { category, featured, q } = req.query;
  const where = { status: "published" };
  if (featured === "1") where.is_featured = true;
  if (q) where.title_ar = { [Op.like]: `%${q}%` };

  const include = [withCategory];
  if (category) {
    include[0] = { ...withCategory, where: { slug: category } };
  }

  const events = await Event.findAll({
    where,
    include,
    order: [
      ["sort_order", "ASC"],
      ["date_start", "ASC"],
    ],
  });
  res.json({ events });
}

/* ===== GET /api/events/:id ===== */
export async function getEvent(req, res) {
  const event = await Event.findOne({
    where: { id: req.params.id, status: "published" },
    include: [withCategory],
  });
  if (!event) return res.status(404).json({ message: "الفعالية غير موجودة" });
  const json = event.toJSON();
  if (!json.seatmap_image && json.venue_id) {
    const { default: Venue } = await import("../../models/venue/Venue.js");
    const v = await Venue.findByPk(json.venue_id, { attributes: ["map_image"] });
    if (v?.map_image) json.seatmap_image = v.map_image;
  }
  res.json({ event: json });
}
