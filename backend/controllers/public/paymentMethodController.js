import PaymentMethod from "../../models/payment/PaymentMethod.js";
import Event from "../../models/event/Event.js";

/* ===== GET /api/payment-methods?event_id= (المفعّلة فقط) ===== */
export async function listPaymentMethods(req, res) {
  let methods = await PaymentMethod.findAll({
    where: { is_active: true },
    order: [["sort_order", "ASC"], ["id", "ASC"]],
  });

  // فوري محذوف من المنصة نهائيًا
  methods = methods.filter((m) => m.key !== "fawry");

  // «الدفع عند الاستلام» متاح فقط لفعاليات الاستلام من الفرع (بلا QR).
  // أي فعالية يُرسل لها QR (instant / before_event) → لا نقدي تلقائيًا.
  const eventId = req.query.event_id;
  if (eventId) {
    const event = await Event.findByPk(eventId, { attributes: ["id", "delivery_mode"] });
    if (event && event.delivery_mode !== "branch_pickup") {
      methods = methods.filter((m) => m.key !== "cash");
    }
  }

  res.json({ methods });
}

/* ===== GET /api/admin/payment-methods (الكل) ===== */
export async function adminListPaymentMethods(_req, res) {
  const methods = await PaymentMethod.findAll({ order: [["sort_order", "ASC"], ["id", "ASC"]] });
  res.json({ methods });
}

/* ===== PATCH /api/admin/payment-methods/:id (toggle/تعديل) ===== */
export async function updatePaymentMethod(req, res) {
  const m = await PaymentMethod.findByPk(req.params.id);
  if (!m) return res.status(404).json({ message: "وسيلة الدفع غير موجودة" });
  const fields = ["name_ar", "icon", "is_active", "sort_order"];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  await m.update(updates);
  res.json({ message: "تم التحديث", method: m });
}
