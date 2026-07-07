import SupportMessage from "../../models/support/SupportMessage.js";
import SupportSession from "../../models/support/SupportSession.js";
import { emitSupportMessage, emitSession } from "../../utils/socket.js";

// أحدث جلسة للمستخدم
async function latestSession(userId) {
  return SupportSession.findOne({ where: { user_id: userId }, order: [["id", "DESC"]] });
}

function presentSession(s) {
  if (!s) return null;
  return {
    id: s.id, status: s.status, closed_by: s.closed_by, closed_at: s.closed_at,
    rating: s.rating, rating_comment: s.rating_comment, rated_at: s.rated_at,
  };
}

/* ===== GET /api/support/messages — محادثة المستخدم الحالية ===== */
export async function myMessages(req, res) {
  const session = await latestSession(req.user.id);
  const where = { user_id: req.user.id };
  if (session) where.session_id = session.id;
  const messages = await SupportMessage.findAll({ where, order: [["createdAt", "ASC"]] });
  await SupportMessage.update(
    { is_read: true },
    { where: { user_id: req.user.id, sender: "admin", is_read: false } }
  );
  res.json({ messages, session: presentSession(session) });
}

/* ===== POST /api/support/messages — المستخدم يرسل ===== */
export async function sendMessage(req, res) {
  let session = await latestSession(req.user.id);
  // لا جلسة أو الجلسة مغلقة → افتح جلسة جديدة (القديمة تبقى مغلقة نهائيًا)
  if (!session || session.status === "closed") {
    session = await SupportSession.create({ user_id: req.user.id, status: "open" });
    emitSession(req.user.id, "support:session", presentSession(session));
  }
  const msg = await SupportMessage.create({
    session_id: session.id,
    user_id: req.user.id,
    sender: "user",
    body: req.body.body,
  });
  emitSupportMessage(req.user.id, msg.toJSON());
  res.status(201).json({ message: msg, session: presentSession(session) });
}

/* ===== POST /api/support/close — المستخدم ينهي المحادثة ===== */
export async function closeMySession(req, res) {
  const session = await latestSession(req.user.id);
  if (!session || session.status === "closed")
    return res.status(400).json({ message: "لا توجد محادثة مفتوحة" });
  await session.update({ status: "closed", closed_by: "user", closed_at: new Date() });
  emitSession(req.user.id, "support:closed", presentSession(session));
  res.json({ message: "تم إنهاء المحادثة", session: presentSession(session) });
}

/* ===== POST /api/support/sessions/:id/rate — تقييم بعد الإغلاق ===== */
export async function rateSession(req, res) {
  const session = await SupportSession.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!session) return res.status(404).json({ message: "الجلسة غير موجودة" });
  if (session.status !== "closed") return res.status(400).json({ message: "لا يمكن تقييم محادثة مفتوحة" });
  if (session.rating) return res.status(400).json({ message: "سبق تقييم هذه المحادثة" });
  const rating = parseInt(req.body.rating);
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ message: "التقييم من 1 إلى 5" });
  await session.update({ rating, rating_comment: req.body.comment || null, rated_at: new Date() });
  emitSession(req.user.id, "support:rated", presentSession(session));
  res.json({ message: "شكرًا لتقييمك", session: presentSession(session) });
}

export { presentSession, latestSession };
