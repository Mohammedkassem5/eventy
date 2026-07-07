import TicketCategory from "../../models/ticket/TicketCategory.js";
import Seat from "../../models/ticket/Seat.js";
import { sequelize } from "../../config/db.js";

const rowLabel = (i) => {
  // 0->A ... 25->Z, 26->AA ...
  let s = "";
  i += 1;
  while (i > 0) {
    const r = (i - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
};

// يبني صفوف×أعمدة مقاعد لفئة
function buildSeats(eventId, categoryId, rows, cols) {
  const seats = [];
  for (let r = 0; r < rows; r++) {
    const label = rowLabel(r);
    for (let c = 0; c < cols; c++) {
      seats.push({
        event_id: eventId,
        ticket_category_id: categoryId,
        row_label: label,
        seat_number: c + 1,
        seat_code: `${label}${c + 1}`,
        status: "available",
        x: c,
        y: r,
      });
    }
  }
  return seats;
}

/* ===== GET /api/admin/ticket-categories/event/:eventId ===== */
export async function adminListTicketCategories(req, res) {
  const categories = await TicketCategory.findAll({
    where: { event_id: req.params.eventId },
    order: [["sort_order", "ASC"], ["id", "ASC"]],
  });
  res.json({ categories });
}

/* ===== POST /api/admin/ticket-categories  (ينشئ الفئة + يولّد المقاعد) ===== */
export async function createTicketCategory(req, res) {
  const { event_id, name, price, color_hex, rows_count, cols_count, sort_order, points_reward } = req.body;
  const rows = Number(rows_count) || 0;
  const cols = Number(cols_count) || 0;
  const total = rows * cols;

  const result = await sequelize.transaction(async (t) => {
    const category = await TicketCategory.create(
      {
        event_id, name, price,
        color_hex: color_hex || "#f75200",
        rows_count: rows, cols_count: cols,
        total_seats: total, available_seats: total,
        sort_order: sort_order ?? 0,
        points_reward: points_reward ?? 0,
      },
      { transaction: t }
    );
    if (total > 0) {
      await Seat.bulkCreate(buildSeats(event_id, category.id, rows, cols), { transaction: t });
    }
    return category;
  });

  res.status(201).json({ message: "تمت إضافة الفئة وتوليد المقاعد", category: result });
}

/* ===== PATCH /api/admin/ticket-categories/:id  (تعديل الفئة) ===== */
export async function updateTicketCategory(req, res) {
  const category = await TicketCategory.findByPk(req.params.id);
  if (!category) return res.status(404).json({ message: "الفئة غير موجودة" });

  const allowed = ["name", "price", "color_hex", "sort_order", "points_reward", "zone"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  await category.update(updates);
  res.json({ message: "تم تحديث الفئة", category });
}

/* ===== GET /api/admin/ticket-categories/:id/seats — خريطة المقاعد للأدمن ===== */
export async function categorySeats(req, res) {
  const category = await TicketCategory.findByPk(req.params.id);
  if (!category) return res.status(404).json({ message: "الفئة غير موجودة" });
  const seats = await Seat.findAll({
    where: { ticket_category_id: category.id },
    attributes: ["id", "row_label", "seat_number", "seat_code", "status", "x", "y"],
    order: [["y", "ASC"], ["seat_number", "ASC"]],
  });
  const booked = seats.filter((s) => s.status === "booked").length;
  res.json({
    seats,
    counts: { total: seats.length, booked, available: seats.length - booked },
  });
}

/* ===== DELETE /api/admin/ticket-categories/:id ===== */
export async function deleteTicketCategory(req, res) {
  const category = await TicketCategory.findByPk(req.params.id);
  if (!category) return res.status(404).json({ message: "الفئة غير موجودة" });
  await sequelize.transaction(async (t) => {
    await Seat.destroy({ where: { ticket_category_id: category.id }, transaction: t });
    await category.destroy({ transaction: t });
  });
  res.json({ message: "تم حذف الفئة ومقاعدها" });
}
