import Event from "../../models/event/Event.js";
import Category from "../../models/category/Category.js";

const withCategory = { model: Category, as: "category", attributes: ["id", "name_ar", "slug"] };

const FIELDS = [
  "category_id", "venue_id", "title_ar", "title_en", "subtitle", "description",
  "poster", "gallery", "seatmap_image", "venue_name", "city", "date_start", "date_end",
  "price_from", "status", "is_featured", "sort_order",
  "guidelines", "guidelines_title", "show_guidelines",
  "delivery_mode", "qr_lead_hours", "pickup_branches", "allow_cod",
];

/* ===== POST /api/admin/events/:id/seatmap (multipart: image) ===== */
export async function uploadSeatmap(req, res) {
  if (!req.file) return res.status(400).json({ message: "لم تُرفع أي صورة" });
  const event = await Event.findByPk(req.params.id);
  if (!event) return res.status(404).json({ message: "الفعالية غير موجودة" });
  await event.update({ seatmap_image: `/uploads/events/${req.file.filename}` });
  res.json({ message: "تم رفع المخطط", event });
}

/* ===== POST /api/admin/events/:id/gallery (multipart: images[]) ===== */
export async function uploadGallery(req, res) {
  const event = await Event.findByPk(req.params.id);
  if (!event) return res.status(404).json({ message: "الفعالية غير موجودة" });
  if (!req.files?.length) return res.status(400).json({ message: "لم تُرفع أي صور" });
  const urls = req.files.map((f) => `/uploads/events/${f.filename}`);
  const gallery = [...(event.gallery || []), ...urls];
  await event.update({ gallery });
  res.json({ message: "تم رفع الصور", event });
}

/* ===== GET /api/admin/events/:id — فعالية واحدة (للأدمن، تشمل المسودة) ===== */
export async function adminGetEvent(req, res) {
  const event = await Event.findByPk(req.params.id, { include: [withCategory] });
  if (!event) return res.status(404).json({ message: "الفعالية غير موجودة" });
  const json = event.toJSON();
  // احتياطي: لو الفعالية بلا مخطط، خذ صورة المكان
  if (!json.seatmap_image && json.venue_id) {
    const { default: Venue } = await import("../../models/venue/Venue.js");
    const v = await Venue.findByPk(json.venue_id, { attributes: ["map_image"] });
    if (v?.map_image) json.seatmap_image = v.map_image;
  }
  res.json({ event: json });
}

/* ===== GET /api/admin/events ===== */
export async function adminListEvents(_req, res) {
  const events = await Event.findAll({
    include: [withCategory],
    order: [["createdAt", "DESC"]],
  });
  res.json({ events });
}

/* ===== POST /api/admin/events ===== */
export async function createEvent(req, res) {
  const data = {};
  for (const f of FIELDS) if (req.body[f] !== undefined) data[f] = req.body[f];
  const event = await Event.create(data);
  res.status(201).json({ message: "تمت إضافة الفعالية", event });
}

/* ===== PATCH /api/admin/events/:id ===== */
export async function updateEvent(req, res) {
  const event = await Event.findByPk(req.params.id);
  if (!event) return res.status(404).json({ message: "الفعالية غير موجودة" });

  const updates = {};
  for (const f of FIELDS) if (req.body[f] !== undefined) updates[f] = req.body[f];
  await event.update(updates);
  res.json({ message: "تم تحديث الفعالية", event });
}

/* ===== DELETE /api/admin/events/:id ===== */
export async function deleteEvent(req, res) {
  const event = await Event.findByPk(req.params.id);
  if (!event) return res.status(404).json({ message: "الفعالية غير موجودة" });
  await event.destroy();
  res.json({ message: "تم حذف الفعالية" });
}

/* ===== POST /api/admin/events/:id/poster (multipart: poster) ===== */
export async function uploadPoster(req, res) {
  if (!req.file) return res.status(400).json({ message: "لم يتم رفع أي صورة" });
  const event = await Event.findByPk(req.params.id);
  if (!event) return res.status(404).json({ message: "الفعالية غير موجودة" });
  await event.update({ poster: `/uploads/events/${req.file.filename}` });
  res.json({ message: "تم تحديث الصورة", event });
}
