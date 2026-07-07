// قواعد العمل لطرق التسليم الثلاث

// متى يُتاح الـ QR للمستخدم؟
export function qrAvailable(event) {
  if (!event) return false;
  const mode = event.delivery_mode;
  if (mode === "instant") return true;
  if (mode === "branch_pickup") return false; // استلام من الفرع — لا QR إلكتروني
  if (mode === "before_event") {
    if (!event.date_start) return false;
    const release = new Date(event.date_start).getTime() - (event.qr_lead_hours || 24) * 3600 * 1000;
    return Date.now() >= release;
  }
  return false;
}

// هل يُسمح بإلغاء الحجز؟
export function canCancel(booking, event) {
  if (!booking || booking.status !== "confirmed") return false;
  const mode = event?.delivery_mode;
  if (mode === "instant") return false; // لا إلغاء نهائيًا
  const start = event?.date_start ? new Date(event.date_start).getTime() : Infinity;
  if (mode === "branch_pickup") return Date.now() < start; // حتى بدء الفعالية
  if (mode === "before_event") {
    const release = start - (event?.qr_lead_hours || 24) * 3600 * 1000;
    return Date.now() < release; // قبل وصول الـ QR فقط
  }
  return false;
}

// نص توضيحي للمستخدم
export function deliveryLabel(event) {
  switch (event?.delivery_mode) {
    case "instant":
      return "تصلك التذكرة فورًا — لا يمكن الإلغاء أو الاسترداد";
    case "branch_pickup":
      return "الاستلام من الفرع/مكان الفعالية";
    case "before_event":
      return `تصلك التذكرة قبل الفعالية بـ ${event?.qr_lead_hours || 24} ساعة`;
    default:
      return "";
  }
}
