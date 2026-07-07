import Venue from "../../models/venue/Venue.js";

const FIELDS = ["name_ar", "name_en", "type", "address", "city", "capacity", "lat", "lng", "is_active", "sort_order"];
const order = [["sort_order", "ASC"], ["id", "ASC"]];

/* ===== GET /api/admin/venues ===== */
export async function adminListVenues(_req, res) {
  res.json({ venues: await Venue.findAll({ order }) });
}

/* ===== GET /api/venues — عام (المفعّلة) ===== */
export async function listVenues(_req, res) {
  res.json({ venues: await Venue.findAll({ where: { is_active: true }, order }) });
}

/* ===== POST /api/admin/venues ===== */
export async function createVenue(req, res) {
  const data = {};
  for (const f of FIELDS) if (req.body[f] !== undefined) data[f] = req.body[f];
  const venue = await Venue.create(data);
  res.status(201).json({ message: "تمت إضافة المكان", venue });
}

/* ===== PATCH /api/admin/venues/:id ===== */
export async function updateVenue(req, res) {
  const venue = await Venue.findByPk(req.params.id);
  if (!venue) return res.status(404).json({ message: "المكان غير موجود" });
  const updates = {};
  for (const f of FIELDS) if (req.body[f] !== undefined) updates[f] = req.body[f];
  await venue.update(updates);
  res.json({ message: "تم التحديث", venue });
}

/* ===== DELETE /api/admin/venues/:id ===== */
export async function deleteVenue(req, res) {
  const venue = await Venue.findByPk(req.params.id);
  if (!venue) return res.status(404).json({ message: "المكان غير موجود" });
  await venue.destroy();
  res.json({ message: "تم الحذف" });
}

/* ===== POST /api/admin/venues/:id/map (multipart: image) ===== */
export async function uploadVenueMap(req, res) {
  if (!req.file) return res.status(400).json({ message: "لم تُرفع صورة" });
  const venue = await Venue.findByPk(req.params.id);
  if (!venue) return res.status(404).json({ message: "المكان غير موجود" });
  const map = `/uploads/venues/${req.file.filename}`;
  await venue.update({ map_image: map });
  // انشر الصورة تلقائيًا على كل فعاليات هذا المكان
  const { default: Event } = await import("../../models/event/Event.js");
  await Event.update({ seatmap_image: map }, { where: { venue_id: venue.id } });
  res.json({ message: "تم رفع المخطط", venue });
}
