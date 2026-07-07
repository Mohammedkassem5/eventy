import { Op, fn, col, literal } from "sequelize";
import User from "../../models/user/User.js";
import Booking from "../../models/booking/Booking.js";
import Event from "../../models/event/Event.js";
import { logAudit } from "../../utils/audit.js";

/* ===== GET /api/admin/users — قائمة العملاء ===== */
export async function listCustomers(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 12);
  const { q, status } = req.query;

  const now = new Date();
  const bannedClause = { [Op.or]: [{ is_banned: true }, { banned_until: { [Op.gt]: now } }] };
  const where = {};
  if (status === "banned") Object.assign(where, bannedClause);
  else if (status === "active") Object.assign(where, { is_banned: false, [Op.or]: [{ banned_until: null }, { banned_until: { [Op.lte]: now } }] });
  else if (status === "verified") where.is_verified = true;
  if (q) {
    where[Op.or] = [
      { name: { [Op.like]: `%${q}%` } },
      { email: { [Op.like]: `%${q}%` } },
      { phone: { [Op.like]: `%${q}%` } },
    ];
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: {
      exclude: ["password"],
      include: [[literal(`(SELECT COUNT(*) FROM bookings b WHERE b.user_id = User.id)`), "bookings_count"]],
    },
    order: [["createdAt", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });

  const summary = {
    total: await User.count(),
    verified: await User.count({ where: { is_verified: true } }),
    banned: await User.count({ where: bannedClause }),
  };

  res.json({
    users: rows.map((u) => ({ ...u.toJSON(), ban: u.banStatus(), bookings_count: u.get("bookings_count") })),
    summary,
    total: count,
    page,
    pages: Math.ceil(count / limit) || 1,
  });
}

/* ===== GET /api/admin/users/:id — تفاصيل العميل + حجوزاته ===== */
export async function getCustomer(req, res) {
  const user = await User.findByPk(req.params.id, { attributes: { exclude: ["password"] } });
  if (!user) return res.status(404).json({ message: "العميل غير موجود" });

  const bookings = await Booking.findAll({
    where: { user_id: user.id },
    include: [{ model: Event, as: "event", attributes: ["id", "title_ar"] }],
    order: [["createdAt", "DESC"]],
    limit: 20,
  });

  const spentRow = await Booking.findOne({
    where: { user_id: user.id, status: "confirmed" },
    attributes: [[fn("COALESCE", fn("SUM", col("total_amount")), 0), "spent"]],
    raw: true,
  });

  res.json({
    user: { ...user.toJSON(), ban: user.banStatus() },
    stats: {
      bookings: bookings.length,
      spent: Number(spentRow?.spent || 0),
    },
    bookings: bookings.map((b) => ({
      booking_ref: b.booking_ref,
      event: b.event?.title_ar,
      quantity: b.quantity,
      total_amount: b.total_amount,
      status: b.status,
      createdAt: b.createdAt,
    })),
  });
}

/* ===== PATCH /api/admin/users/:id/ban — حظر (دائم أو مؤقت بعدد أيام) ===== */
export async function banUser(req, res) {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: "العميل غير موجود" });

  const { days, reason, permanent } = req.body;
  if (permanent) {
    await user.update({ is_banned: true, banned_until: null, ban_reason: reason || null });
  } else {
    const d = parseInt(days);
    if (!Number.isInteger(d) || d < 1) return res.status(400).json({ message: "عدد أيام غير صالح" });
    const until = new Date(Date.now() + d * 24 * 60 * 60 * 1000);
    await user.update({ is_banned: false, banned_until: until, ban_reason: reason || null });
  }
  await logAudit(req, "user.ban", `${user.name} <${user.email}>`, { permanent: !!permanent, days: permanent ? null : Number(days), reason: reason || null });
  res.json({ message: "تم حظر العميل", ban: user.banStatus() });
}

/* ===== PATCH /api/admin/users/:id/unban — رفع الحظر ===== */
export async function unbanUser(req, res) {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: "العميل غير موجود" });
  await user.update({ is_banned: false, banned_until: null, ban_reason: null });
  await logAudit(req, "user.unban", `${user.name} <${user.email}>`);
  res.json({ message: "تم رفع الحظر", ban: user.banStatus() });
}

/* ===== PATCH /api/admin/users/:id/points — تعديل نقاط الولاء ===== */
export async function adjustPoints(req, res) {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: "العميل غير موجود" });
  const delta = parseInt(req.body.delta);
  if (!Number.isInteger(delta)) return res.status(400).json({ message: "قيمة غير صالحة" });
  const next = Math.max(0, user.loyalty_points + delta);
  await user.update({ loyalty_points: next });
  res.json({ message: "تم تعديل النقاط", loyalty_points: next });
}
